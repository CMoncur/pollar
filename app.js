/* --- NODE DEPENDENCIES --- */
const express = require('express')
    , app     = express()
    , JW      = require('jigawatt')
    , mg      = require('mongoose')
    , R       = require('ramda')

/* --- INTERNAL DEPENDENCIES --- */
const db = require('./example-schemas')

/* --- ENVIRONMENT SETTINGS --- */
mg.connect('mongodb://localhost/data/pollar-dev')
mg.Promise = global.Promise

/* --- Jigawatt Middleware --- */

// Because indexes of our lists start at 0, responses are coming
// from the database unmatched to the option thereunto pertaining.
// We need to decrement each response so they align with the options
// that the users are voting for.
// getAnswer :: [ Object ] -> [ Integer ]
const getAnswer = (arr) => R.compose(
  R.map(R.dec)
, R.pluck('answer')
)(arr)

// Each city comes from the database with the city name and the
// country or state that the city is in.  This is more verbose than
// what we want, so let's truncate each string at the comma so that
// we're just left with the city name.
// getCity :: Object -> [ String ]
const getCity = (obj) => R.map(
  R.replace(/\,.*$/, '')
, obj.questions
)

// We have two lists now -- a list of cities and a list of responses.
// We have to tally the votes for each city and display the total
// for each city alongside the city name.
// mergeData :: [ String ] -> [ Int ] -> [ Object ]
const mergeData = (options, responses) => {
  // Tally total vote for a specific city
  return R.map((str) => {
    let ind = R.indexOf(str, options)

    let votes = R.compose(
      R.length
    , R.filter(R.equals(ind))
    )(responses)

    return R.assoc(str, votes, {})
  }, options)
}

// The Jigawatt middleware function pull
const pollDetails = {
  // We have three
  awesomize: (v) => ({
    poll     : { validate : [ v.required ] }
  , options  : {
      read     : R.path([ 'poll' ])
    , sanitize : [ getCity ]
    , validate : [ v.required, v.isArray ]
    }
  , responses : {
      read     : R.path([ 'responses' ])
    , sanitize : [ getAnswer ]
    , validate : [ v.required, v.isArray ]
    }
  })

, io: (req, data) => ({
    poll    : data.poll.title
  , results : mergeData(data.options, data.responses)
  })
}

/* --- ROUTES --- */
app.get('/best-city-results', (req, res) => {
  const data = {
    poll      : db.Poll.findOne({ _id: '57f691081739bcb1144630a2' })
  , responses : db.Vote.find({ poll_id: '57f691081739bcb1144630a2' })
  }

  const formatPoll = JW(pollDetails, data)

  formatPoll(data, { json : (data) => data })
    .then((details) => res.send(details))
    .catch((err) => console.log('There was an error here: ' + err))
})

/* --- SERVER --- */
app.listen(8000, (err) => {
  if (err) return console.log('Could not start server!')
  console.log('Listening on port 8000')
})
