import * as pulumi from "@pulumi/pulumi";
import { RdsDatabase } from "./rdsComponent";

const config = new pulumi.Config()
let allocatedStorage = config.requireNumber("allocated_storage");
let db_username = config.require("db_username");
const db_password = config.requireSecret("db_password");
let db_name = config.require("database_name") 

const rdsDb = new RdsDatabase("my-db", {
    allocatedStorage: 20,
    engine: "mysql",
    maxAllocatedStorage: 0,
    dbName: "testdb",
    username: "yteDemoAdmin",
    password: db_password,
    publiclyAccessible: true,
    identifier: "temporaldemodbprod"
});


export const rdsAddress = rdsDb.RdsAddress; 
