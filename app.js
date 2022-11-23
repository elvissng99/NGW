const express = require('express')
const expressHandlebars = require('express-handlebars')

const fs = require('fs')
const $rdf = require('rdflib')


//eventually nid read from foaf file
// const foafProfile = fs.readFileSync('foafProfile.ttl').toString()

//hardcoded profile for now
user_profile = {
    name: "elvis",
    email: "emailelvis@gmail.com",
    interest:{
        genre:["Comedy", "Thriller"],
        actor:["Tom Holland", "Tom Cruise"]
    }
}

// const store = $rdf.graph()
// $rdf.parse(
// 	foafProfile,
// 	store,
// 	"http://gameverse.com/owl/games", HERE IDK WHAT TO PUT
// 	"text/turtle"
// )

const stringQuery = `
	SELECT
		?id
		?name
		?description
	WHERE {
		?game a <http://gameverse.com/owl/games#Game> .
		?game <http://gameverse.com/owl/games#id> ?id .
		?game <http://gameverse.com/owl/games#name> ?name .
		?game <http://gameverse.com/owl/games#description> ?description .
	}
`

// const query = $rdf.SPARQLToQuery(stringQuery, false, store)


// const games = store.querySync(query).map(
// 	gameResult => {
// 		return {
// 			id: gameResult['?id'].value,
// 			name: gameResult['?name'].value,
// 			description: gameResult['?description'].value
// 		}
// 	}
// )

const ParsingClient = require('sparql-http-client/ParsingClient')

const clientDBPedia = new ParsingClient({
	endpointUrl: 'https://dbpedia.org/sparql'
})
	
const query = `
    SELECT ?f 
    WHERE {
            ?f rdf:type dbo:Film .
            ?f dbo:starring dbr:Tom_Holland .
    }
`

clientDBPedia.query.select(query).then(rows => {
    
    // Too see what we get back as result:
    console.log(rows)
    
    // rows.forEach(row => {
    //     game.erleaseDate = row.releaseDate.value
    // })
    
}).catch(error => {
    console.log(error)
})

const clientWIKI = new ParsingClient({
	endpointUrl: 'https://query.wikidata.org/sparql'
})
	
const query2 = `
    SELECT ?item ?itemLabel ?id WHERE {
        ?item wdt:P1562?id .
        ?item wdt:P495 wd:Q30.
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 100
`

clientWIKI.query.select(query2).then(rows => {
    
    // Too see what we get back as result:
    console.log(rows)
    
    // rows.forEach(row => {
    //     game.erleaseDate = row.releaseDate.value
    // })
    
}).catch(error => {
    console.log(error)
})


console.log("starting")
const app = express()

app.engine('hbs', expressHandlebars.engine({
	defaultLayout: "main.hbs"
}))

// GET /games/super_mario_bros
app.get("/games/:id", function(request, response){
	
	const id = request.params.id // "super_mario_bros"
	
	const game = games.find(g => g.id == id)
	
	const model = {
		game: game
	}
	
	response.render("game.hbs", model)
	
})

// GET /games
app.get("/games", function(request, response){
	
	const model = {
		games: games
	}
	
	response.render("games.hbs", model)
	
})

// GET /layout.css
app.get("/layout.css", function(request, response){
	response.sendFile("layout.css", {root: "."})
})

// GET /
app.get("/", function(request, response){
	response.render("index.hbs")
})

// GET /about
app.get("/about", function(request, response){
	response.render("about.hbs")
})

app.listen(8080)