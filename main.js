const express = require('express')
const bodyParser = require('body-parser')
const child_process = require('child_process')
const { inspect } = require('util');
const config = require('./config.json')
const app = express()
const port = process.argv[2]
const jarpath = config.jarpath

// some debugging info
console.log("Configuration: " + JSON.stringify(config))

// create application/json parser
var jsonParser = bodyParser.json()

// Set up port array stuff
var portPool = config.portpool
var portsUsed = {}

app.post('/api/job/upload', jsonParser, (req, res) => {
    var usedPortsList = Object.keys(portsUsed).map(e => portsUsed[e])
    var thisPort = getRandomFromArray(portPool)
    // var portUsed = true;
    // console.log("Used: " + usedPortsList.length + " Pool: " + portPool.length)
    if (portPool.length < 1) {
        res.status(503).send({message: "All available ports are in use."})
        return;
    }
    // while (true) {
    //     newPort = getRandomFromArray(portPool)
    //     if (!usedPortsList.includes(newPort)){
    //         thisPort = newPort
    //         break;
    //     }
    //     console.log("Port " + newPort + " already in use.")
    // }
    filename = req.body['filename']
    spawnSlave(thisPort, filename)
    res.send({port: thisPort})
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

function spawnSlave(thisPort, filename) {
    (function(){
        var file = config.datapath + filename
        var child = child_process.spawn('java', ['-jar', jarpath, thisPort, file])
        portPool = removeA(portPool, thisPort)
        mypid = child.pid
        portsUsed[mypid] = thisPort
        console.log("pid " + mypid + " for port " + thisPort + " saving to file " + file)
        console.log("ports used: " + JSON.stringify(portsUsed) + " ports available: " + JSON.stringify(portPool))
        child.on('close', (code) => {
            // console.log(inspect(child))
            console.log("Upload slave with pid " + child.pid + " has shut down with code " + code)
            recyclePort = portsUsed[child.pid]
            portPool.push(recyclePort)
            // console.log(recyclePort + JSON.stringify(portsUsed))
            console.log("Recycled " + recyclePort + " back into the port pool.")
            delete portsUsed[child.pid]
            console.log("ports used: " + JSON.stringify(portsUsed) + " ports available: " + JSON.stringify(portPool))
        })
        child.stdout.on('data', function(data) {
            // console.log(data)
            child.stdout.resume()
        })
        // console.log(inspect(this))
    })()
}

function getRandomFromArray(arr) {
    return arr[Math.floor((Math.random()*arr.length))];
}

function removeA(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}
