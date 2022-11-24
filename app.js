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
        genre:["Comedy", "Superhero","Thriller"],
        actor:["Tom Holland", "Tom Cruise"],
        country:["United States of America", "South Korea"]
    },
    movieYearRange:[2020,2022],
}

if(user_profile.interest.actor.length >0) user_profile.actorLinks = {};

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
	
for(let i = 0; i <user_profile.interest.actor.length; i++){
    let query = "SELECT ?movie ?name WHERE { ?movie rdf:type dbo:Film . ?movie dbo:starring ?actor. ?actor dbp:name \""+user_profile.interest.actor[i]+"\"@en. ?movie dbp:name ?name }"
    clientDBPedia.query.select(query).then(result => {
    
        // console.log(result)
        user_profile.actorLinks[user_profile.interest.actor[i]] = []
        result.forEach(row => {
            let movie = {[row.name.value]:row.movie.value}
            user_profile.actorLinks[user_profile.interest.actor[i]].push(movie)
        })
        // console.log(user_profile)
    }).catch(error => {
        console.log(error)
    })
}

// const query = `
//     SELECT ?movie
//     WHERE {
//             ?movie rdf:type dbo:Film .
//             ?movie dbo:starring ?actor.
//             FILTER(?actor = dbr:Tom_Holland)
//     }
// `

// clientDBPedia.query.select(query).then(rows => {
    
//     // Too see what we get back as result:
//     console.log(rows)
    
//     // rows.forEach(row => {
//     //     game.erleaseDate = row.releaseDate.value
//     // })
    
// }).catch(error => {
//     console.log(error)
// })

const clientWIKI = new ParsingClient({
	endpointUrl: 'https://query.wikidata.org/sparql'
})

//movies from USA, superhero genre, between 2018 and 2022 inclusive
// const query2 = `
// SELECT DISTINCT ?item ?itemLabel ?id WHERE {
//     ?item wdt:P1562 ?id .
//     ?countryid rdfs:label "United States of America"@en.
//     ?genre rdfs:label "superhero film"@en.
//     ?item wdt:P495 ?countryid.
//     ?item wdt:P136 ?genre.
//     ?item wdt:P577 ?date.
//     SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }.
//     FILTER(xsd:integer(YEAR(?date)) >=2018 && xsd:integer(YEAR(?date)) <=2022)
// }
// LIMIT 10
// `

//get the id of country, for example USA = Q30
// `
// SELECT ?item ?itemLabel WHERE {
//     ?item rdfs:label "United States of America"@en.  
//     ?item wdt:P31 wd:Q6256 .
//     SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
// }
// LIMIT 10
// `

//get id of genre, for example superhero film = Q1535153
// `
// SELECT ?item ?itemLabel WHERE {
//     ?item rdfs:label "superhero film"@en.  
//     ?item wdt:P31 wd:Q201658 .
//     SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
// }
// LIMIT 10
// `

// clientWIKI.query.select(query2).then(rows => {
    
//     // Too see what we get back as result:
//     console.log(rows)
    
//     // rows.forEach(row => {
//     //     game.erleaseDate = row.releaseDate.value
//     // })
    
// }).catch(error => {
//     console.log(error)
// })


console.log("starting")
const app = express()
app.engine('hbs', expressHandlebars.engine({
	defaultLayout: "main.hbs"
}))
app.set('view engine', 'hbs')
app.use(express.static("public"))
app.use(express.urlencoded({
    extended:true
}))




//display user profile
app.get('/', function(request, response){
    response.render('index.hbs',{
        user_profile
    })
})

app.post('/query',function(request,response){
    let query = "SELECT DISTINCT ?item ?itemLabel WHERE {"
    query += "?item wdt:P31 wd:Q11424."
    if (request.body.country) query += "?countryid rdfs:label \""+ request.body.country+ "\"@en. ?item wdt:P495 ?countryid."
    if(request.body.genre){
        for (let i = 0; i <request.body.genre.length;i++){
            let genre = request.body.genre[i].toLowerCase() + " film"
            query+= "?genre"+i+" rdfs:label \""+genre+"\"@en. ?item wdt:P136 ?genre"+ i +"."
        }
    }
    query += "?item wdt:P577 ?date."
    query += "SERVICE wikibase:label { bd:serviceParam wikibase:language \"[AUTO_LANGUAGE],en\". }."
    query += "FILTER(xsd:integer(YEAR(?date)) >="+user_profile.movieYearRange[0]+" && xsd:integer(YEAR(?date)) <="+user_profile.movieYearRange[1] +")"
    query += "} LIMIT 10"

    // console.log(query)
    clientWIKI.query.select(query).then(result => {
        response.render('result.hbs',{result})
        
        
    }).catch(error => {
        console.log(error)
    })

})

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