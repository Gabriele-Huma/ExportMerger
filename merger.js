const fs = require('fs')
const path = require('path')

function isArray(item) {
    Object.prototype.toString.call(item) === '[object Array]'
}

function isObject(item)
{
    return item !== undefined && item !== null && item.constructor == Object;
}

// Merges the modules json files in a set of folders
// where each folder usually corresponds to a user.
// "Usually" means the code is not assuming that, it's using the 
// userId property inside each json for user matching instead.
function merge(folders) {
    // Dictionary of finalised files in the form moduleName: content 
    // TODO: instead of collecting all in memory, we could pick one module at a time (e.g. Oxygen Saturation)
    // merge and close it. This is slower but reduces memory pressure.
    var mergedFilesDictionary = {}
    
    for(folder of folders) {
        console.log(`\nProcessing folder ${folder}`)

        // List the files
        let jsons = fs.readdirSync(folder)
            .filter(f => path.extname(f).toLowerCase() === ".json")
            .map(f => `${folder}/${f}`)
       
        // For each file let's pick an existing namesake file in the list of final files
        // or create a new one
        for(json of jsons) {
            // Module name is the file name without extension
            let moduleName = path.basename(json).replace(path.extname(json), "")
            var mergedFile = mergedFilesDictionary[moduleName] ? mergedFilesDictionary[moduleName] : []
            
            // Read the json content and append it to the existing file as a new user
            console.log(`Processing module ${moduleName}`)
            let jsonContent = JSON.parse(fs.readFileSync(json))
            
            // Note: jsonContent contains an array with all the entries for a given user and given module
            for(entry of jsonContent) {
                if(entry.userId) 
                    mergedFile.push(entry)                
                else 
                    console.log(`Module ${moduleName} data does not contain the user identifier and cannot be merged`)
            }  
              
            // Update the module file with the new content
            mergedFilesDictionary[moduleName] = mergedFile
        }
    }
    return mergedFilesDictionary
}

// Writes ddown a set of data structures into correspondent files in a given folder
function store(mergedFiles, outputFolder, outputType) {
    console.log(`\nConsolidating merged files to ${outputFolder} in ${outputType} format`)
    if(!fs.existsSync(outputFolder))
        fs.mkdirSync(outputFolder)
        
    // Convert to CSV if specified
    if(outputType.toLowerCase() === 'csv') {
        for(module of Object.keys(mergedFiles))      
            fs.writeFileSync(`${outputFolder}/${module}.csv`, toCSV(mergedFiles[module]))
    }
    else {
        for(module of Object.keys(mergedFiles)) 
            fs.writeFileSync(`${outputFolder}/${module}.json`, JSON.stringify(mergedFiles[module]))
    }
}

// Flat the struccture of a json
// { key1: { key2: v1, key3: v2 }} becomes { key1.key2: v1, key1.key3: v2 }
function flat(keyPrefix, json) {
    // Recursively dig into the object structure
    if(isArray(json)) {
        var res = {}
        for(var i = 0; i < json.length; i++) {
            let item = json[i]
            let flatten = flat(`${i}`, item)
            for(subkey of Object.keys(flatten)) 
                res[`${keyPrefix}.${subkey}`] = flatten[subkey]
        }
        return res
    } 
    else if(isObject(json)) {
        var res = {}
        for(key of Object.keys(json)) {
            let flatten = flat(`${key}`, json[key])
            for(subkey of Object.keys(flatten)) 
                res[`${keyPrefix}.${subkey}`] = flatten[subkey]
        }
        return res
    }
    else {
        var res = {}
        res[keyPrefix] = json
        return res
    }
}

// Converts JSON to CSV
function toCSV(moduleContent) {    
    // First, flat json structure of each module
    let flatten = moduleContent.map(e => flat("root", e))
    
    // Second, for extra safety let's just callect all the 'columns' of all the entries
    // Just in case some entry has more colums than another
    var columns = []
    flatten.forEach(entry => Object.keys(entry).forEach(col => {
        if(!columns.includes(col))
            columns.push(col)
    }))

    // Now following the order of the columns we create the CSV header, removing the 'root.' prefix
    let csvHeader = columns.map(c => c.replace('root.', '')).join(";")

    // And then the content, for each entry
    let csvContent = flatten.map(entry => columns.map(c => entry[c] ? entry[c] : "").join(";"))

    // Finally return the concatenation of header and content
    return csvHeader + "\n" + csvContent.join("\n") 
}

// Main
let args = process.argv.slice(2)
let rootFolder = args[0]
let outputFolder = args[1]
let outputType = args[2]
if(!rootFolder || !outputFolder) {
    console.log("--- Usage ---\nnode merger.js <inputFolder> <outputFolder> <csv/json>\n--- ----- ---")
    return
}
if(!outputType)
    outputType = "json"

// Check folder exists
try {
    if (fs.existsSync(rootFolder)) {
        // List the folders within the root
        let folders = fs.readdirSync(rootFolder, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => `${rootFolder}/${dirent.name}`)
            
        // Merge
        let mergedFiles = merge(folders)   

        // Consolidate
        store(mergedFiles, outputFolder, outputType)
    }
    else 
        console.log(`The folder ${rootFolder} does not exist`)
} catch(err) {
}
