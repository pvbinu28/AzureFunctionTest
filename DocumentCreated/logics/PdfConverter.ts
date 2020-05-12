import { Context } from '@azure/functions';
import { v4 as uuidv4 } from "uuid";
import fs = require('fs');
import pdf = require('pdf-poppler');
import { BlobServiceClient } from '@azure/storage-blob';

export class PdfConverter {

    private readonly connectionString: string;
    private context: Context;
    private itemName: string;
    private tempName: string;
    private tempFile: string;
    private sPath: string;
    private outPath: string;
    private opts;

    private tempDir: string = "tmp";
    private outputContainer: string = "converted";

    constructor(context: Context) {
        this.connectionString = process.env.docsnt1_STORAGE;
        this.context = context;
    }

    initialize(targetFormat: string) {
        
        this.itemName = String(this.context.bindingData.name).replace(".pdf", '').toLowerCase().replace(' ', '');
        this.tempName = uuidv4();
        this.tempFile = this.tempName + ".pdf";
        this.sPath = this.tempDir + "/" + this.tempFile;
        this.outPath = this.tempDir + "/" + this.tempName;
        this.opts = {
            format: targetFormat,
            out_dir: this.outPath,
            out_prefix: this.tempName,
            page: null
        }

        this.createTempDirectories();
    }

    convertPdfToImage(myBlob: any): Promise<any> {
         fs.writeFileSync(this.sPath, myBlob);
         return pdf.convert(this.sPath, this.opts);
    }

    uploadFiles(): Promise<any> {
        const files = fs.readdirSync(this.outPath);
        let client = BlobServiceClient.fromConnectionString(this.connectionString);
        const containerClient = client.getContainerClient(this.outputContainer);
        let uploads = [];
        files.forEach(item => {
            const outFileName = this.outPath + "/" + item;
            // uploading converted files.
            const blobClient = containerClient.getBlockBlobClient(this.itemName + "/" + item);
            uploads.push(blobClient.uploadFile(outFileName).then(result => { fs.unlinkSync(outFileName); }));  
            
        });

        return Promise.all(uploads).then(result => {
            fs.rmdirSync(this.outPath);
            fs.unlinkSync(this.sPath);
            this.context.log("done");
        }); 

    }

    private createTempDirectories() {
        if(!fs.existsSync(this.tempDir))
        {
            fs.mkdirSync(this.tempDir);
        }

        fs.mkdirSync(this.outPath);
    }
}