var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) { queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    /******** 从这里开始看，上面不要看 ************/
    const session = JSON.parse(fs.readFileSync('./session.json').toString());
    console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery)
    //  登录请求
    if (path === '/sign_in' && method === 'POST') {

        const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
        //  把用户上传的东西用array存下来
        const array = [];
        //  监听用户请求的上传事件
        request.on('data', (chunk) => {
            array.push(chunk);
        })

        request.on('end', () => {
            //  把不同的数据合成字符串
            const string = Buffer.concat(array).toString();
            const obj = JSON.parse(string);   //  name,password 把字符串变成对象

            //  判断用户名和密码是否与数据库的值匹配
            const user = userArray.find((user) => user.name === obj.name && user.password === obj.password);
            console.log(user);
            if (user === undefined) {
                response.statusCode = 400;
                response.setHeader('Content-Type', `text/json;charset=utf-8`);
                //  错误返回一个错误码
                response.end(`{"errorCode":4001}`);
            }
            else {
                response.statusCode = 200;
                //  在用户名和密码都匹配时，标记该用户的登录，HttpOnly  禁止前端修改cookie
                //response.setHeader('Set-Cookie', 'logined=1;HttpOnly');

                //  标记用户id,有安全漏洞
                //response.setHeader('Set-Cookie', `user_id=${user.id};HttpOnly`);

                //  把一个随机数显示在页面，把真的id藏在服务器
                const random = Math.random();
                const session = JSON.parse(fs.readFileSync('./session.json').toString());
                session[random] = { user_id: user.id };
                fs.writeFileSync('./session.json', JSON.stringify(session));
                response.setHeader('Set-Cookie', `session_id=${random};HttpOnly`);
            }
            response.end();  //  提交相应
        });//  end

    }//  /sign_in

    //  主页请求
    else if (path === '/home.html') {
        // 不知道怎么写
        //  判断用户是否是已登录过的
        const cookie = request.headers['cookie'];
        //  获取用户的id,不安全，获取sessionId

        let sessionId;
        //  先用 , 把cookie分开，选择key为session_id 的字段，再把第一个值取出来，再用 = 分离，取第二个值
        try {
            sessionId = cookie.split(';')
                .filter(s => s.indexOf('session_id=') >= 0)[0]
                .split('=')[1];
        } catch { }

        //  如果sessionId 并且对应的user_id存在，则表示已登录
        if (sessionId && session[sessionId]) {
            const userId = session[sessionId].user_id;
            const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
            const homeHTML = fs.readFileSync('./public/home.html').toString();
            //  获取id对应的用户名
            const user = userArray.find(user => user.id === userId);
            let string = '';
            if (user) {
                string = homeHTML.replace(' {{loginStatus}}', '已登录')
                    .replace('{{user.name}}', user.name);
            } else {
                string = homeHTML.replace(' {{loginStatus}}', '未登录')
                    .replace('{{user.name}}', '');
            }
            response.write(string);

        }
        else {
            const homeHTML = fs.readFileSync('./public/home.html').toString();
            const string = homeHTML.replace(' {{loginStatus}}', '未登录')
                .replace('{{user.name}}', '');
            response.write(string);

        }
        response.end();  //  提交相应
    }

    //  如果是一个POST请求，把他的数据记录下来
    else if (path === '/register' && method === 'POST') {
        response.setHeader('Content-Type', `text/html;charset=utf-8`);
        const userArray = JSON.parse(fs.readFileSync("./db/users.json"));

        //  把用户上传的东西用array存下来
        const array = [];
        //  监听用户请求的上传事件
        request.on('data', (chunk) => {
            array.push(chunk);
        })
        request.on('end', () => {
            //  把不同的数据合成字符串
            const string = Buffer.concat(array).toString();
            const obj = JSON.parse(string);   //  把字符串变成对象
            const lastUser = userArray[userArray.length - 1];
            const newUser = {
                //  id 为最后一个用户的 id + 1
                id: lastUser ? lastUser.id + 1 : 1,
                name: obj.name,
                password: obj.password
            };
            //  把新用户加到当前用户数组中
            userArray.push(newUser);
            fs.writeFileSync('./db/users.json', JSON.stringify(userArray));
            response.end();  //  提交相应
        })// on

    }//if  /register
    else {
        //  实现根据路径判断
        response.statusCode = 200

        //  如果path是 '/'  则默认访问 ' /index.html'
        const filepath = path === '/' ? '/index.html' : path;
        const index = filepath.lastIndexOf('.');
        //  suffix是后缀
        const suffix = filepath.substring(index);
        const fileTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg'
        }
        response.setHeader('Content-Type', `${fileTypes[suffix] || 'text/html'} ;charset=utf-8`)
        let content;
        try {
            content = fs.readFileSync(`./public${filepath}`);
        } catch (error) {
            content = '文件不存在';
            response.status = 404;
        }
        response.write(content);
        response.end();  //  提交相应
    }//else



    /******** 代码结束，下面不要看 ************/
})

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)
