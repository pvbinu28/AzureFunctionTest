import { AzureFunction, Context } from "@azure/functions";
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from "uuid";
import pdf = require('pdf-poppler');
import fs = require('fs');
import path = require('path');
import { PdfConverter } from "./logics/PdfConverter";

const blobTrigger: AzureFunction = async function (context: Context, myBlob: any): Promise<void> {

    const converter = new PdfConverter(context);
    converter.initialize("jpeg");
    try {
        await converter.convertPdfToImage(myBlob);
        await converter.uploadFiles();
    } catch(error) {
        context.log(error);
    }

};

export default blobTrigger;
