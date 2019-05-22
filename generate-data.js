const faker = require("faker");

// Date.prototype.toJSON = function () { return this.toISOString() }

const r = generateCollection(200);
console.log(r.ioLen, r.jsonLen, `${Math.round(100 - r.diff)}% smaller!`)

function generateCollection(count) {

  // Loop and generate JSON and IO records
  let jsonRecords = [];
  let ioRecords = [];
  let ioLen = 0;
  let jsonLen = 0;
  while(count !== 0) {
    const r = generateRecord()
    const ioHeader = toIOHeader()
    const ioData = toIOData(r)
    const jsonData = JSON.stringify(r)
    jsonRecords.push(jsonData);
    ioRecords.push(ioData);

    console.log(ioHeader);
    console.log(ioData);
    console.log(jsonData);
    ioLen += ioData.length;
    jsonLen += jsonData.length;
    count--;
  }

  // Find the lengths and diffs
  const diff = ioLen * 100 / jsonLen

  return {
    jsonRecords,
    ioRecords,
    jsonLen,
    ioLen,
    diff
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
    str += `{${acc.amount},${acc.date},${acc.business},${acc.name},${acc.type},${acc.account}},`
  })
  return str
}

function generateRecord() {
  const card = faker.helpers.createCard();
  return {
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
    posts: card.posts,
    accountHistory: card.accountHistory
  }
}

function toIOHeader() {
  return "name,email,address:{streetA,city,state,country,zipcode,geo:{lat,lng}}," +
         "phone,website,company:{name,catchPhrase,bs},posts:[{words,sentence,sentences,paragraph}]," +
         "accountHistory:[{amount,date,business,name,type,account}]"
}

function toIOData(r) {
  return  `${r.name},${r.email},` + 
          `{${r.address.streetA},${r.address.city},${r.address.state},${r.address.country},${r.address.zipcode},` + 
          `{${r.address.geo.lat},${r.address.geo.lng}}},` +
          `${r.phone},${r.website},` +
          `{${r.company.name},${r.company.catchPhrase},${r.company.bs}}` + 
          `[${getPosts(r.posts)}]` +
          `[${getAccounts(r.accountHistory)}]`
}
