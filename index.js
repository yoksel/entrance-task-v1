const path = require('path');
var engines = require('consolidate');

const express = require('express');
const bodyParser = require('body-parser');

const pagesRoutes = require('./pages/routes');
const graphqlRoutes = require('./graphql/routes');

const sassMiddleware = require('node-sass-middleware');

const app = express();

// Templates
app.set('views', path.join(__dirname, 'views'));
app.engine('mustache', engines.mustache);
app.set('view engine', 'mustache');

// Parse request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', pagesRoutes)
app.use('/graphql', graphqlRoutes);

app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false,
  sourceMap: true
}));

app.use(express.static(path.join(__dirname, 'public')));


app.listen(3000, () => console.log('Express app listening on localhost:3000'));
