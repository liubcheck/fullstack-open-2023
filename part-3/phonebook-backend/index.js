require('dotenv').config()
const express = require('express')

const app = express()
const morgan = require('morgan')
const cors = require('cors')
const mongoose = require('mongoose')

mongoose.set('strictQuery', true)

const Person = require('./models/person')

morgan.token('req-body', (req) => JSON.stringify(req.body))

app.use(express.static('build'))
app.use(express.json())
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :req-body'))
app.use(cors())

app.get('/api/persons', (request, response) => {
  Person.find({}).then((persons) => {
    response.json(persons)
  })
})

app.get('/api/persons/:id', (request, response, next) => {
  Person
    .findById(request.params.id)
    .then((person) => {
      if (person) {
        response.json(person)
      } else {
        response.status(404).end()
      }
    })
    .catch((error) => next(error))
})

app.get('/info', (request, response) => {
  Person
    .countDocuments()
    .then((count) => {
      const currentTime = new Date()
      const infoHtml = `
        <div>
          <p>Phonebook has info for ${count} people</p>
          <p>${currentTime}</p>
        </div>
      `
      response.send(infoHtml)
    })
    .catch((error) => {
      console.log(error)
      response.status(404).end()
    })
})

app.post('/api/persons', (request, response, next) => {
  const { body } = request

  if (!body.name || !body.number) {
    return response.status(400).json({
      error: 'name or number missing',
    })
  }

  const person = new Person({
    name: body.name,
    number: body.number,
  })

  return person.save()
    .then((savedPerson) => {
      response.json(savedPerson)
    })
    .catch((error) => { next(error) })
})

app.put('/api/persons/:id', (request, response, next) => {
  const { name, number } = request.body

  const person = {
    name,
    number,
  }

  Person.findByIdAndUpdate(
    request.params.id,
    person,
    { new: true, runValidators: true, context: 'query' },
  )
    .then((updatedPerson) => {
      response.json(updatedPerson)
    })
    .catch((error) => next(error))
})

app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndRemove(request.params.id)
    .then(() => {
      response.status(204).end()
    })
    .catch((error) => { next(error) })
})

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return response.status(400).send({ error: 'malformatted id' })
  } if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  }
  return next(error)
}

app.use(errorHandler)

const { PORT } = process.env
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
