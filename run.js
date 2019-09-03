const fs = require('fs');
const faker = require("faker");


function logStats(records) {
  const {
    ioHeader,
    ioRecords,
    jsonRecords
  } = records

  const ioLen = ioRecords.reduce((len, r) => len + r.length, 0)
  const ioLenWithHeader = ioHeader.length + ioLen + 5
  const jsonLen = JSON.stringify(jsonRecords).length
  const diff = 100 - (Math.round(ioLen * 10000 / jsonLen) / 100)
  const diffWithIOHeader = 100 - (Math.round(ioLenWithHeader * 10000 / jsonLen) / 100)


  console.log(`For ${ ioRecords.length } record(s)`)
  console.log(`==================================`)
  console.log(`IO Data:`, ioLen)
  console.log(`IO Data with Header:`, ioLenWithHeader)
  console.log(`JSON:`, jsonLen)
  console.log(`IO is ${diff}% smaller than JSON!`)
  console.log(`IO with header is ${diffWithIOHeader}% smaller than JSON!`)
  console.log("")
}

function saveIOData (records) {
  // Save Internet Object Records
  const ioStream = fs.createWriteStream("./data/data.io")
  ioStream.write(records.ioHeader)
  ioStream.write("\n---\n")
  records.ioRecords.forEach((record) => {
    ioStream.write(`~ ${record}\n`)
  })
  ioStream.end()

  // Save Internet Object Records
  const jsonStream = fs.createWriteStream("./data/data.json")
  // console.log(records.jsonRecords)
  records.jsonRecords.forEach((record) => {
    jsonStream.write(JSON.stringify(record))
  })
  jsonStream.end()
}

function generateRecords(count) {

  // Loop and generate JSON and IO records
  let jsonRecords = [];
  let ioRecords = [];
  let ioLen = 0;
  let jsonLen = 0;

  while(count !== 0) {
    const r = generateRecord()
    const ioData = toIOData(r)
    // const jsonData = JSON.stringify(r)
    jsonRecords.push(r);
    ioRecords.push(ioData);

    count--;
  }

  // Find the lengths and diffs
  // const diff = ioLen * 100 / jsonLen

  return {
    ioHeader: toIOHeader(),
    ioRecords,
    jsonRecords,
    // jsonLen,
    // ioLen,
    // diff
  }
}

function getPosts(posts) {
  let str = "";
  posts.map((post) => {
    str += `{${post.words},${post.sentence},${post.sentences},${post.paragraph}},`
  })
  return str
}

function getAccounts(accounts) {
  let str = "";
  accounts.map((acc) => {
    str += `{${
      acc.amount},${
      acc.date.toISOString().replace(/[-:]/g, "")},${
      acc.business},${
      acc.name},${
      acc.type},${
      acc.account}},`
  })
  return str
}

function generateRecord(includePosts=false) {
  const card = faker.helpers.createCard();
  const data = {
    name: card.name,
    email: card.email,
    address: {
      streetA: card.address.streetA,
      city: card.address.city,
      state: card.address.state,
      country: card.address.country,
      zipcode: card.address.zipcode,
      geo: {
        lat: card.address.geo.lat,
        lng: card.address.geo.lng
      }
    },
    phone: card.phone,
    website: card.website,
    company: {
      name: card.company.name,
      catchPhrase: card.company.catchPhrase,
      bs: card.company.bs
    },
    accountHistory: card.accountHistory
  }

  if (includePosts) {
    data.posts = card.posts
  }
  return data
}

function toIOHeader() {
  return "name,email,address:{streetA,city,state,country,zipcode,geo:{lat,lng}}," +
         "phone,website,company:{name,catchPhrase,bs}," +
         "accountHistory:[{amount,date,business,name,type,account}]"
}

function toIOData(r, includePosts=false) {
  let data = `${r.name},${r.email},` +
          `{${r.address.streetA},${r.address.city},${r.address.state},${r.address.country},${r.address.zipcode},` +
          `{${r.address.geo.lat},${r.address.geo.lng}}},` +
          `${r.phone},${r.website},` +
          `{${r.company.name},${r.company.catchPhrase},${r.company.bs}}` +
          `[${getAccounts(r.accountHistory)}]`
  if (includePosts) {
    data += `[${getPosts(r.posts)}]`
  }

  return data
}

// Generate Records
const r1 = generateRecords(1);
logStats(r1)

const r100 = generateRecords(100);
logStats(r100)

const r1000 = generateRecords(1000);
logStats(r1000)

// Save 1000 records (IO and JSON)
saveIOData(r100)
