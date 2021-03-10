const express = require('express');
const { default: ParseServer, ParseGraphQLServer } = require('parse-server');


const app = express();

const api = new ParseServer({
  databaseURI: 'mongodb://localhost:27017/dashboard',
  appId: 'hello',
  masterKey: 'world',
  serverURL: 'http://localhost:1338/parse',
  publicServerURL: 'http://localhost:1338/parse',
});
const graphQL = new ParseGraphQLServer(api, {graphQLPath: '/parse', playgroundPath: '/playground'});

app.use('/parse', api.app);
graphQL.applyGraphQL(app);


const port = 1338;
const httpServer = require('http').createServer(app);

httpServer.listen(port, () => {
  console.log(`parse-server running on port: ${port}`);
});
