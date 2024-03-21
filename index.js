import fs from 'fs';
import { faker } from '@faker-js/faker';

function logStats(records) {
  const {
    ioHeader,
    ioRecords,
    jsonRecords
  } = records

  const ioLen             = ioRecords.reduce((len, r) => len + r.length, 0)
  const ioLenWithHeader   = ioHeader.length + ioLen + 5
  const jsonLen           = JSON.stringify(jsonRecords).length
  const diff              = 100 - (Math.round(ioLen * 10000 / jsonLen) / 100)
  const diffWithIOHeader  = 100 - (Math.round(ioLenWithHeader * 10000 / jsonLen) / 100)


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

  // Save JSON Records
  fs.writeFileSync("./data/data.json", JSON.stringify(records.jsonRecords))
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
  let strs = accounts.map((acc) => `{${
    acc.amount},${
    acc.date.toISOString().replace(/[-:]/g, "")},${
    acc.business},${
    acc.name},${
    acc.type},${
    acc.account}}`)
  return strs.join(",")
}

function generateRecord(includePosts=false) {
  const address = faker.location
  const person = faker.person
  const company = faker.company
  const data = {
    name: person.fullName(),
    email: faker.internet.email(),
    address: {
      streetA: address.street(),
      city: address.city(),
      state: address.state(),
      country: address.country(),
      zipcode: address.zipCode(),
      geo: {
        lat: address.latitude(),
        lng: address.longitude()
      }
    },
    phone: faker.phone.number(),
    website: faker.internet.domainName(),
    company: {
      name: company.name(),
      catchPhrase: company.catchPhrase(),
      bs: company.buzzPhrase()
    },
    accountHistory: [0,1,2,3,4].map(() => {
      return {
        amount: faker.finance.amount(),
        date: faker.date.recent(),
        business: company.name(),
        name: person.fullName(),
        type: faker.finance.transactionType(),
        account: faker.finance.accountNumber()
      }
    })
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
  let data = `${_(r.name)},${r.email},` +
          `{${_(_(r.address.streetA))},${_(_(r.address.city))},${_(r.address.state)},${_(r.address.country)},${r.address.zipcode},` +
          `{${r.address.geo.lat},${r.address.geo.lng}}},` +
          `${r.phone},${_(r.website)},` +
          `{${_(r.company.name)},${_(r.company.catchPhrase)},${_(r.company.bs)}},` +
          `[${getAccounts(r.accountHistory.map((x) => {
            return {
              amount: x.amount,
              date: x.date,
              business: _(x.business),
              name: _(x.name),
              type: x.type,
              account: x.account
            }
          }))}]`
  if (includePosts) {
    data += `[${getPosts(r.posts)}]`
  }

  return data
}

// fixes the io open string with regular string with double quotes
// when the string has single quotes to escape them.
function _(str) {
  // if starts with "  then return as is
  if (str.startsWith('"')) {
    return str
  }

  // If it contains comma, then enclose in double quotes
  if (str.indexOf(",") !== -1) {
    return `"${str}"`
  }

  return str.indexOf("'") === -1 ? str : `"${str}"`
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
