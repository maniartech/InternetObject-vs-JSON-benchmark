const faker = require("faker");

// Date.prototype.toJSON = function () { return this.toISOString() }

const r = generateRecord()
const ioHeader = toIOHeader()
const ioData = toIOData(r)
const jsonData = JSON.stringify(r)
console.log(ioHeader)
console.log(ioData)
console.log(jsonData)

const ioLen = ioData.length
const jsonLen = jsonData.length
const diff = ioLen * 100 / jsonLen
console.log(ioLen, jsonLen, `${Math.round(100 - diff)}% smaller!`)

function generateCollection(count) {

  // Loop and generate JSON and IO records

  // Find the lengths and diffs

  return {
    jsonRecords: [],
    ioRecords: [],
    jsonLen: 0,
    ioLen: 0,
    diff: 0
  }
}

function generateRecord() {
  const name = faker.name
  return {
    firstName: name.firstName(),
    lastName: name.lastName(),
    prefix: name.prefix(),
    jobTitle: name.jobTitle(),
    email: faker.internet.email(),
    birthDate: faker.date.past(30),
    address: {
      street: faker.address.streetAddress(),
      city: faker.address.city(),
      state: faker.address.state(),
      zipCode: faker.address.zipCode(),
      location: {
        latitude: faker.address.latitude(),
        longitude: faker.address.longitude()
      }
    }
  }
}

function toIOHeader() {
  return "firatName,lastName,prefix,jobTitle,email,birthDate," +
         "address:{street,city,state,zipCode,{latitude,longitude}}"
}

function toIOData(r) {
  return  `${r.firstName},${r.lastName},${r.prefix},` +
          `${r.jobTitle},${r.email},${r.birthDate.toISOString()},` +
          `{${r.address.street},${r.address.city},${r.address.state},${r.address.zipCode},` +
          `{${r.address.location.latitude, r.address.location.longitude}}}`
}

