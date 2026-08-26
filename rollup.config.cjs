// rollup.config.js
module.exports = {
  input: 'index',
  output: {
    file: 'dist/BrAPIBoxPlotter.js',
    format: 'umd',
    name: 'BrAPIBoxPlotter',
    globals: {
      'd3':'d3',
      '@turf/turf':'turf',
      '@solgenomics/brapijs':'BrAPI',
      'leaflet':'L',
    },
    sourcemap: true
  }
};
