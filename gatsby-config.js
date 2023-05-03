const path = require('path')

module.exports = {
  siteMetadata: {
    title: `Sudoku Assistant`,
  },
  graphqlTypegen: true,
  // flags: {
  //   DEV_SSR: true
  // },
  plugins: [
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-typescript`,
    `gatsby-plugin-emotion`,
    `gatsby-plugin-material-ui`,
    {
      resolve: 'gatsby-plugin-root-import',
      options: {
        resolveModules: [path.join(__dirname, 'src')],
      },
    },
  ],
}
