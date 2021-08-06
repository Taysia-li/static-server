//  读取文件
const fs = require('fs');

//  读数据库
const usersString = fs.readFileSync('./db/users.json').toString();
const usersArray = JSON.parse(usersString);
console.log(usersString);


//  写数据库
const user3 = { id: 4, name: 'tom', password: 'qqq' };
usersArray.push(user3);
//  把数组变成字符串
const string = JSON.stringify(usersArray);
fs.writeFileSync('./db/users,json', string);