import * as pulumi from "@pulumi/pulumi";
import { RdsDatabase } from "./rdsComponent";

const config = new pulumi.Config()

const rdsDb = new RdsDatabase("my-db", {
    allocatedStorage: 20,
    engine: "mysql",
    maxAllocatedStorage: 0,
    dbName: "testdb",
    username: "yteDemoAdmin",
    password: "t3stpwdforD3mo",
    publiclyAccessible: true,
    identifier: "temporaldemodbprod"
});


export const rdsAddress = rdsDb.RdsAddress; 