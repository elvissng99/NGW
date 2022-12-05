const express = require('express')
const expressHandlebars = require('express-handlebars')

const fs = require('fs')
const $rdf = require('rdflib')

const people = fs.readFileSync('people.ttl').toString()
//console.log(user_profile)

const store = $rdf.graph()

$rdf.parse(
	people,
	store,
	"http://userprofile.com/owl/profile",
	"text/turtle"
)

var userprofile = $rdf.sym('http://userprofile.com/owl/profile#UserProfile')
var interest = $rdf.sym('http://userprofile.com/owl/profile#Interest')
var hasinterest = $rdf.sym('http://userprofile.com/owl/profile#hasInterest')
var name = $rdf.sym('http://userprofile.com/owl/profile#name')
var email = $rdf.sym('http://userprofile.com/owl/profile#email')
var movieyearstart = $rdf.sym('http://userprofile.com/owl/profile#movieYearStart')
var movieyearend = $rdf.sym('http://userprofile.com/owl/profile#movieYearEnd')
var genre = $rdf.sym('http://userprofile.com/owl/profile#genre')
var actor = $rdf.sym('http://userprofile.com/owl/profile#actor')
var user_interest = $rdf.sym('http://userprofile.com/owl/profile#user_interest')
var country = $rdf.sym('http://userprofile.com/owl/profile#country')
var user = $rdf.sym('http://userprofile.com/owl/profile#user')

var user_country = store.match(user_interest, country)
var user_genre = store.match(user_interest, genre)
var user_actor = store.match(user_interest, actor)
var user_name = store.match(user, name)
var user_email = store.match(user, email)
var user_movieyearstart = store.match(user, movieyearstart)
var user_movieyearend = store.match(user, movieyearend)

 user_profile = {
    name: user_name[0].object.value,
    email: user_email[0].object.value,
    interest: {
        genre:[],
        actor:[],
        country:[]
    },
    movieyearstart: user_movieyearstart[0].object.value,
    movieyearend: user_movieyearend[0].object.value
 }

 for (let i=0; i<user_genre.length; i++){
    user_profile.interest.genre.push(user_genre[i].object.value)
}

for (let i=0; i<user_country.length; i++){
    user_profile.interest.country.push(user_country[i].object.value)
}

for (let i=0; i<user_actor.length; i++){
    user_profile.interest.actor.push(user_actor[i].object.value)
}

if(user_profile.interest.actor.length >0) user_profile.actorLinks = {};

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

const clientWIKI = new ParsingClient({
	endpointUrl: 'https://query.wikidata.org/sparql'
})

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
    query += "FILTER(xsd:integer(YEAR(?date)) >="+user_profile.movieyearstart+" && xsd:integer(YEAR(?date)) <="+user_profile.movieyearend +")"
    query += "} LIMIT 10"

    clientWIKI.query.select(query).then(result => {
        response.render('result.hbs',{result})
        
        
    }).catch(error => {
        console.log(error)
    })

})

app.listen(8080)