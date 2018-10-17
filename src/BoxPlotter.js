/**
 * [BoxPlotter description]
 */
class BoxPlotter {
  /**
   * [constructor description]
   * @param {Array|BrAPINode} phenotypes
   */
  constructor(container) {
    this.container = d3.select(container);
    this.data = Promise.resolve({});
  }
  setData(phenotypes){
    this.data = new Promise((resolve,reject)=>{
      if(phenotypes.forEach){
        resolve({raw:phenotypes})
      }
      else{
        phenotypes.all(data=>{
          resolve({raw:data})
        })
      }
    }).then(d=>{
      // prepare data
      d.obs = d.raw.reduce((obs,ou)=>{
        ou.observations.forEach(o=>{
          o.value = parseFloat(o.value);
          if(o.value==Math.floor(o.value)) o.value=Math.floor(o.value);
          o._obsUnit=ou
        });
        ou.treatments.sort((a,b)=>{
          if(a.factor!=b.factor) return a.factor<b.factor?-1:1;
          if(a.modality!=b.modality) return a.modality<b.modality?-1:1;
          return 0;
        })
        return obs.concat(ou.observations);
      },[])
      return d;
    });
    this.getVariables().then(vs=>{
      if(!this.variable ||!vs.some(v=>v.key==this.variable)) this.setVariable(vs[0].key)
    });
    this.setGroupings(this.groupings||[]);
  }
  getGroupings(){
    return Promise.resolve(d3.entries(BoxPlotter.groupAccessors));
  }
  getVariables(cb){
    var out = this.data.then(d=>{
      return d3.entries(d.obs.reduce((vars,o)=>{
        if(!vars[o.observationVariableDbId]) vars[o.observationVariableDbId] = o.observationVariableName;
        return vars;
      },{}));
    })
    if(cb) return out.then(cb);
    else return out
  }
  setVariable(variable){
    this.variable = variable;
    this.draw();
  }
  draw(){
    var plt = {
      w:100,
      bw:30,
      h:300,
      ts:10,
      scale:d3.scaleLinear(),
      f: d3.format(".3g")
    };
    plt.scale.range([plt.h-10,30]);
    plt.axis = d3.axisLeft(plt.scale);
    
    this.data.then(d=>{
      if(!this.variable) return;
      this.container.selectAll(".axis").data([0]).enter().append("svg")
        .classed("axis",true)
        .attr("width",30)
        .attr("height",plt.h)
        .append("g")
        .attr("transform","translate(28,0)");
      this.container.selectAll(".axis").lower().select("g").call(plt.axis);
      var boxplots = this.container.selectAll(".boxplot").data(
        d.groups.map(g=>{
          var datum = {obs:g.value[this.variable]}
          return datum
        }).filter(g=>!!g.obs && g.obs.length>=3)
          .map(g=>{
            g.label = d.labelFunc(g.obs[0]);
            g.q1 = d3.quantile(g.obs, 0.25, o=>o.value);
            g.q2 = d3.quantile(g.obs, 0.5, o=>o.value);
            g.q3 = d3.quantile(g.obs, 0.75, o=>o.value);
            g.max = g.q3+1.5*(g.q3-g.q1);
            g.min = g.q1-1.5*(g.q3-g.q1);
            plt.scale.domain(d3.extent(plt.scale.domain().concat([
              g.min,g.max,g.q1,g.q2,g.q3,
              d3.min(g.obs,o=>o.value),
              d3.max(g.obs,o=>o.value)
            ])));
            console.log(g);
            return g;
          })
      );
      boxplots.exit().remove();
      console.log(plt.scale.domain(),this.variable,d);
      var newBoxplots = boxplots.enter().append("svg")
        .classed("boxplot",true)
        .attr("width",plt.w+"px").attr("height",plt.h+"px");
      newBoxplots.append("g").classed("label",true).append("text")
        .attr("y",20).attr("text-anchor","middle");
      newBoxplots.append("rect").classed("iqr",true)
        .attr("fill","steelblue")
        .attr("x",plt.w/2-(plt.bw/2)).attr("width",plt.bw);
      newBoxplots.append("text").classed("mintext",true).classed("infotext",true)
        .attr("font-size",plt.ts)
        .attr("text-anchor","end")
        .attr("alignment-baseline","middle")
        .attr("x",plt.w/2-(plt.bw/4+5));
      newBoxplots.append("text").classed("maxtext",true).classed("infotext",true)
        .attr("font-size",plt.ts)
        .attr("text-anchor","end")
        .attr("alignment-baseline","middle")
        .attr("x",plt.w/2-(plt.bw/4+5));
      newBoxplots.append("text").classed("q2text",true).classed("infotext",true)
        .attr("font-size",plt.ts)
        .attr("alignment-baseline","middle")
        .attr("text-anchor","end")
        .attr("x",plt.w/2-(plt.bw/2+5));
      newBoxplots.append("text").classed("q1text",true).classed("infotext",true)
        .attr("font-size",plt.ts)
        .attr("alignment-baseline","middle")
        .attr("x",plt.w/2+(plt.bw/2+5));
      newBoxplots.append("text").classed("q3text",true).classed("infotext",true)
        .attr("font-size",plt.ts)
        .attr("alignment-baseline","middle")
        .attr("x",plt.w/2+(plt.bw/2+5));
      newBoxplots.append("path").classed("minend",true).attr("stroke","#444").attr("stroke-width","1");
      newBoxplots.append("path").classed("maxend",true).attr("stroke","#444").attr("stroke-width","1");
      newBoxplots.append("path").classed("minwhisk",true).attr("stroke","#444").attr("stroke-width","1");
      newBoxplots.append("path").classed("maxwhisk",true).attr("stroke","#444").attr("stroke-width","1");
      var newQ2 = newBoxplots.append("g").classed("q2",true);
      newQ2.append("rect").attr("fill","#444")
        .attr("x",plt.w/2-(plt.bw/2)).attr("width",plt.bw).attr("height",2);
      newQ2.append("circle").attr("fill","#444")
        .attr("stroke","white")
        .attr("cx",plt.w/2).attr("cy",1).attr("r",4);
      var allBoxplots = boxplots.merge(newBoxplots);
      allBoxplots.select(".label text").text(g=>g.label);
      allBoxplots.select(".label").attr("transform",function(){
        var w = this.getBBox().width;
        var scale = plt.w/(w+20);
        scale = 1/scale>1?scale:1;
        return `scale(${scale})translate(${plt.w/2/scale})`
      });
      // allBoxplots.select(".axis").call(plt.axis)
      //   .attr("transform", function(){
      //     return "translate("+(10+this.getBBox().width)+",0)"
      //   });
      allBoxplots.select(".q2")
        .attr("transform",g=>`translate(0,${plt.scale(g.q2)-1})`)
      allBoxplots.select(".mintext").attr("y",g=>plt.scale(g.min)).text(g=>{
        return plt.scale(g.min)-plt.scale(g.q2)>plt.ts?plt.f(g.min):"";
      });
      allBoxplots.select(".maxtext").attr("y",g=>plt.scale(g.max)).text(g=>{
        return plt.scale(g.q2)-plt.scale(g.max)>plt.ts?plt.f(g.max):"";
      });
      allBoxplots.select(".q2text").attr("y",g=>plt.scale(g.q2)).text(g=>{
        return plt.f(g.q2)
      });
      allBoxplots.select(".q1text").attr("y",g=>plt.scale(g.q1)).text(g=>{
        return plt.scale(g.q1)-plt.scale(g.q3)>plt.ts?plt.f(g.q1):"";
      });
      allBoxplots.select(".q3text").attr("y",g=>plt.scale(g.q3)).text(g=>{
        return plt.scale(g.q1)-plt.scale(g.q3)>plt.ts?plt.f(g.q3):"";
      });
      allBoxplots.select(".minend")
        .attr("d",g=>`M${plt.w/2-(plt.bw/4)} ${plt.scale(g.min)} h${plt.bw/2}`);
      allBoxplots.select(".maxend")
        .attr("d",g=>`M${plt.w/2-(plt.bw/4)} ${plt.scale(g.max)} h${plt.bw/2}`);
      allBoxplots.select(".minwhisk")
        .attr("d",g=>`M${plt.w/2} ${plt.scale(g.min)} V${plt.scale(g.q1)}`);
      allBoxplots.select(".maxwhisk")
        .attr("d",g=>`M${plt.w/2} ${plt.scale(g.max)} V${plt.scale(g.q3)}`);
      allBoxplots.select(".iqr")
        .attr("y",g=>plt.scale(g.q3))
        .attr("height",g=>plt.scale(g.q1)-plt.scale(g.q3));
      var outliers = allBoxplots.selectAll(".outlier").data(
        g=>g.obs.filter(o=>o.value>g.max||o.value<g.min)
      );
      outliers.exit().remove();
      outliers.enter().append("circle").classed("outlier",true)
        .attr("fill","none").attr("stroke","#444")
        .attr("r",4).attr("cx",plt.w/2)
        .merge(outliers)
        .attr("cy",o=>plt.scale(o.value));
    })
  }
  setGroupings(groupings){
    this.groupings = groupings;
    this.data = this.data.then(d=>{
      d.keyFunc = ()=>"";
      d.labelFunc = ()=>"";
      groupings.forEach(g=>{
        if(!g) return;
        var lastKey = d.keyFunc;
        var lastLabel = d.labelFunc;
        d.keyFunc = (o)=>{
          var l = lastKey(o);
          return (l!=""?l+", ":l)+BoxPlotter.groupAccessors[g].value(o);
        };
        d.labelFunc = (o)=>{
          var l = lastLabel(o);
          var label = BoxPlotter.groupAccessors[g].label||BoxPlotter.groupAccessors[g].value;
          return (l!=""?l+", ":l)+label(o);
        };
      })
      var nestbyvar = d3.nest().key(o=>o.observationVariableDbId)
        .rollup(g=>g.sort((a,b)=>d3.ascending(a.value, b.value)));
      d.groups = d3.nest().key(d.keyFunc)
        .rollup(obs=>nestbyvar.object(obs))
        .entries(d.obs)
        .sort((a,b)=>d3.ascending(a.key,b.key));
      return d;
    });
    this.draw();
  }
}

BoxPlotter.groupAccessors = {
  study:{
    name:"Study",
    value:(o)=>o._obsUnit.studyDbId,
    label:(o)=>o._obsUnit.studyName
  },
  studyLocation:{
    name:"Study Location",
    value:(o)=>o._obsUnit.studyLocationDbId,
    label:(o)=>o._obsUnit.studyLocation
  },
  block:{
    name:"Block",
    value:(o)=>o._obsUnit.blockNumber,
    label:(o)=>"Block #"+o._obsUnit.blockNumber
  },
  replicate:{
    name:"Replicate",
    value:(o)=>o._obsUnit.replicate,
    label:(o)=>"Replicate #"+o._obsUnit.replicate
  },
  program:{
    name:"Program",
    value:(o)=>o._obsUnit.programName
  },
  germplasm:{
    name:"Germplasm",
    value:(o)=>o._obsUnit.germplasmDbId,
    label:(o)=>o._obsUnit.germplasmName
  },
  treatment:{
    name:"Treatment",
    value:(o)=>{
      return (o._obsUnit.treatments||[]).reduce((v,t)=>{
        v+="Factor: \""+t.factor+"\". "
        v+="Modality: \""+t.modality+"\". "
        return v;
      },"");
    }
  },
  season:{
    name:"Season",
    value:(o)=>o.season
  },
  collector:{
    name:"Collector",
    value:(o)=>o.collector
  }
}

export default function boxPlotter(){
  return new BoxPlotter(...arguments);
};
