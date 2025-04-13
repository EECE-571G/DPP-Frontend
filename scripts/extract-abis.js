const fs = require('fs');
const path = require('path');

// Path to Foundry output
const foundryOutDir = path.resolve(__dirname, '../node_modules/@my-dapp/contracts/out');
// Where to save the extracted ABIs
const abiDir = path.resolve(__dirname, '../src/abis');

// Create the output directory if it doesn't exist
if (!fs.existsSync(abiDir)) {
  fs.mkdirSync(abiDir, { recursive: true });
}

// Read all contract JSON files
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.json')) {
      try {
        const contractData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Check if it has an ABI field
        if (contractData.abi) {
          const contractName = path.basename(file, '.json');
          const abiContent = JSON.stringify(contractData.abi, null, 2);
          
          fs.writeFileSync(
            path.join(abiDir, `${contractName}.json`),
            abiContent
          );
          console.log(`Extracted ABI for ${contractName}`);
        }
      } catch (err) {
        console.error(`Error processing file ${filePath}:`, err);
      }
    }
  });
}

// Start processing
processDirectory(foundryOutDir);
console.log('ABI extraction complete!');