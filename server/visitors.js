const fs = require('fs');


function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}


function handleFirstVisitor(file, ip, date) {
    var data = {};
    data[ip] = {
      "latestDate": date,
      "globalCount": 1,
      "dailyCount": 1
    };

    data = JSON.stringify(data);
    // create & write
    fs.writeFile(file, data, 'utf8', (err) => {
      if (err) console.log("error creating clients.json");
    });    
}

//store the ip of the visitor and returns his dailyCount of visits
function storeVisit(ip) {
  let file = 'clients.json';
  let date = new Date().toISOString();


  if( !fs.existsSync(file) ) {
    handleFirstVisitor(file, ip, date);
    return 1;
  }

  try {
    var data = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.log("readFileError: ", e);
    return -1;
  }

  let res = 1;

  try {
    var obj = JSON.parse(data); //data as object
  } catch(e) {
    console.log("error parsing clients.json: ",e)
    return 0;
  }


  //modify content
  if(typeof obj[ip] === 'undefined') //new user
    obj[ip] = {"latestDate": date, "globalCount": 1, "dailyCount": 1};
  else {  
    obj[ip].globalCount++;
    if(sameDay(new Date(obj[ip].latestDate), new Date(date))) 
      obj[ip].dailyCount++;
    else
      obj[ip].dailyCount = 1;

    obj[ip].latestDate = date;
  }
  json = JSON.stringify(obj); //convert it back to json
  fs.writeFile(file, json, 'utf8', (err) => {
    if(err) console.log("error updating clients.json");
  }); // write it back  

  return obj[ip].dailyCount;
}



  
module.exports.storeVisit = storeVisit;