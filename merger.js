const fs = require('fs')
const path = require('path')

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
function store(mergedFiles, outputFolder) {
    console.log(`\nConsolidating merged files to ${outputFolder}`)
    if(!fs.existsSync(outputFolder))
        fs.mkdirSync(outputFolder)
        
    for(module of Object.keys(mergedFiles)) 
        fs.writeFileSync(`${outputFolder}/${module}.json`, JSON.stringify(mergedFiles[module]))
}

// Main
let args = process.argv.slice(2)
let rootFolder = args[0]
let outputFolder = args[1]
if(!rootFolder || !outputFolder) {
    console.log("--- Usage ---\nnode merger.js <inputFolder> <outputFolder>\n--- ----- ---")
    return
}

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
        store(mergedFiles, outputFolder)
    }
    else 
        console.log(`The folder ${rootFolder} does not exist`)
} catch(err) {
}

