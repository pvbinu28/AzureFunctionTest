import { AzureFunction, Context } from "@azure/functions";
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from "uuid";
import pdf = require('pdf-poppler');
import fs = require('fs');
import path = require('path');

const blobTrigger: AzureFunction = async function (context: Context, myBlob: any): Promise<void> {

    // Declaring constants
    const connectionString = process.env.docsnt1_STORAGE;
    
    // This is used for creating result location.
    const itemName = String(context.bindingData.name).replace(".pdf", '').toLowerCase().replace(' ', '');

    //Unique name for file to process.
    const tempName = uuidv4();

    // File name to store pdf file locally.
    const tempFile = tempName + ".pdf"

    // Temp directory name
    const tempDir = "tmp";

    // output container name.
    const outputContainer = "converted";

    // Creating temp folder to store files to process.
    if(!fs.existsSync(tempDir))
    {
        fs.mkdirSync('tmp');
    }

    // path of the source file
    let sPath = tempDir + "/" + tempFile;
    
    // Writting buffer data to file
    fs.writeFileSync(sPath, myBlob);

    // temp location for output
    const outPath = tempDir + "/" + tempName;

    // Creating temp location for output file.
    fs.mkdirSync(outPath);

    // Config for PDF to image conversion.
    let opts = {
        format: "jpeg",
        out_dir: outPath,
        out_prefix: tempName,
        page: null
    }


    // method to convert the function.
    return pdf.convert(sPath, opts).then(async res => {
        // reading the result files.
        const files = fs.readdirSync(outPath);

        // storage connection.
        let client = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = client.getContainerClient(outputContainer);
        let uploads = [];
        files.forEach(item => {
            const outFileName = outPath + "/" + item;
            // uploading converted files.
            const blobClient = containerClient.getBlockBlobClient(itemName + "/" + item);
            uploads.push(blobClient.uploadFile(outFileName).then(result => { fs.unlinkSync(outFileName); }));  
            
        });
        
        // Deleting all temp files.
        return Promise.all(uploads).then(result => {
            fs.rmdirSync(outPath);
            fs.unlinkSync(sPath);
            context.log("done");
        }); 

    }).catch(err => {
        context.log("Error occured");
        context.log(err);
    }); 

};

export default blobTrigger;
