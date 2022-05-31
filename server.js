// server.js
// where your node app starts

// init project
const express = require('express');
const morgan = require('morgan');
const app = express();
const bodyParser = require('body-parser');
const nodemailer = require("nodemailer");
const schedule = require("node-schedule");
const cache = require('memory-cache');
const mailCache = new cache.Cache();
const axios = require('axios');
app.use(bodyParser());
app.use(morgan());

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', (request, response) => {
  response.sendFile(__dirname + '/views/index.html');
});

// registered OK
app.post('/regist', (request, response) => {
  var params = request.body;
  var checkResult = checkUser(params.userid);

  switch (checkResult) {
    case 1:
      response.sendFile(__dirname + '/views/massage1.html');
      break;
    case 2:
      response.sendFile(__dirname + '/views/massage2.html');
      break;
    case 3:
      response.sendFile(__dirname + '/views/massage3.html');
      break;
    case 4:
      mailCache.put("wish", params.wish);
      mailCache.put("user", params.userid);
      response.sendFile(__dirname + '/views/registOK.html');
      break;
  }
});

// listen for requests :)
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

/////////Start////////////////////checkUser
function checkUser(userid) {
  var checkResult

  var users = cache.get('users');
  var userProfiles = cache.get('userProfiles');

  //console.log(users);
  //console.log(userProfiles);

  if (JSON.stringify(users).indexOf(userid) != -1) {
    var uid;
    for (var user in users) {
      if (users[user].username == userid) {
        uid = users[user].uid;//Get userUid
        break;
      }
    }

    if (JSON.stringify(userProfiles).indexOf(uid) != -1) {
      for (var userProfile in userProfiles) {
        if (userProfiles[userProfile].userUid == uid) {
          var age = getAge(userProfiles[userProfile].birthdate);
          if (age < 10) {
            mailCache.put("address", userProfiles[userProfile].address);
            checkResult = 4;
          } else {
            checkResult = 3;
          }
        }
        break;
      }
    } else {
      checkResult = 2;
    }
  } else {
    checkResult = 1;
  }

  return checkResult;
}

function getAge(birthday) {
  var birthDayTime = new Date(birthday).getTime();
  var nowTime = new Date().getTime();
  return Math.ceil((nowTime - birthDayTime) / 31536000000);
}
/////////End////////////////////checkUser

/////////Start////////////////////get Json Data
async function cacheData() {
  try {

    axios.all([getUser(), getUserProfiles()])
      .then(axios.spread(function (users, userProfiles) {

        cache.put('users', users.data);//cache users
        cache.put('userProfiles', userProfiles.data);//cache userProfiles

        //console.log(cache.get('users'));
        //console.log(cache.get('userProfiles'));
      }));
  } catch (error) {
    const {
      status,
      statusText
    } = error.response;
    console.log(`Error! HTTP Status: ${status} ${statusText}`);
  }
}

function getUser() {
  return axios.get('https://raw.githubusercontent.com/alj-devops/santa-data/master/users.json');
}

function getUserProfiles() {
  return axios.get('https://raw.githubusercontent.com/alj-devops/santa-data/master/userProfiles.json');
}
cacheData()
/////////Start////////////////////get Json Data

/////////Start////////////////////mail
async function mail() {
  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'kari.kessler7@ethereal.email',
      pass: 'SBASCkR9YDmRSp5j9C'
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: 'do_not_reply@northpole.com',
    to: 'santa@northpole.com',
    subject: 'ALL Child Request',
    text: '- child username (eg. '+ mailCache.get("name")+')\n'
         +'- child\'s address (eg. '+ mailCache.get("address")+')\n'
         +'- request free text: '+ mailCache.get("wish")
    ,
  });

  console.log('Message sent: %s', info.messageId);

  // Preview only available when sending through an Ethereal account
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}


// Every 15seconds, the server should send an email with information on all pending (not yet sent) requests including:
//- child username (eg. charlie.brown)
//- child's address (eg. 219-1130, Ikanikeisaiganaibaai, Musashino-shi, Tokyo)
//- request free text as was input in the form
var rule = new schedule.RecurrenceRule()
var times = [1, 16, 31, 46]
rule.second = times
schedule.scheduleJob(rule, function () {
  // mailCache exists
  if (mailCache.size() > 0) {
    mail()           // TODO The request has now been sent only once
    mailCache.clear()// // TODO    all pending (not yet sent) requests including
  } else {
    console.log('send data is null');
  }
})
/////////End////////////////////mail