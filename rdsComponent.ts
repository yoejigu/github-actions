import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as port from "@port-labs/port";


export interface RdsDatabaseArgs {
    identifier?: string;
    instanceClass?: string;
    allocatedStorage: number;
    maxAllocatedStorage?: number;
    dbName: string;
    username: string;
    password: pulumi.Input<string>;
    publiclyAccessible?: boolean;
    engine?: string;
  }


export class RdsDatabase extends pulumi.ComponentResource {
    public readonly RdsAddress: pulumi.Output<string>;
  
    constructor(name: string, args: RdsDatabaseArgs, opts?: pulumi.ComponentResourceOptions) {
        super("pkg:index:RDS", name, {}, opts);

        const rdsPortEntity = new port.Entity("rdsEntity", {
            blueprint: "mysql-rds",
            title: "MySQL RDS DB",
            identifier: "mysql-rds-entity",
            properties:{
                stringProps:{
                    "username": args.username,
                    "password": args.password,
                    "dbName": args.dbName,
                },
                numberProps:{
                    "allocatedStorage": args.allocatedStorage
                }
            }
        })

        //  Create a custom VPC
        const vpc = new aws.ec2.Vpc("custom-vpc", {
            cidrBlock: "10.0.0.0/16",
            enableDnsSupport: true,
            enableDnsHostnames: true,
            tags: { Name: "custom-vpc" },
        },{parent: this});
        
        //  Create an Internet Gateway
        const igw = new aws.ec2.InternetGateway("vpc-igw", {
            vpcId: vpc.id,
        },{parent: this});
        
        //  Route Table and association
        const routeTable = new aws.ec2.RouteTable("vpc-rt", {
            vpcId: vpc.id,
            routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
        },{parent: this});
        
        //  Create 2 public subnets in different AZs
        const subnet1 = new aws.ec2.Subnet("subnet-1", {
            vpcId: vpc.id,
            cidrBlock: "10.0.1.0/24",
            availabilityZone: "us-east-1a",
            mapPublicIpOnLaunch: true,
            tags: { Name: "subnet-1" },
        },{parent: this});
        
        const subnet2 = new aws.ec2.Subnet("subnet-2", {
            vpcId: vpc.id,
            cidrBlock: "10.0.2.0/24",
            availabilityZone: "us-east-1b",
            mapPublicIpOnLaunch: true,
            tags: { Name: "subnet-2" },
        },{parent: this});
        
        // Associate subnets with the route table
        new aws.ec2.RouteTableAssociation("rta-1", {
            subnetId: subnet1.id,
            routeTableId: routeTable.id,
        },{parent: this});
        new aws.ec2.RouteTableAssociation("rta-2", {
            subnetId: subnet2.id,
            routeTableId: routeTable.id,
        },{parent: this});
        
        //  Security Group for RDS
        const dbSg = new aws.ec2.SecurityGroup("db-sg", {
            vpcId: vpc.id,
            description: "Allow Postgres",
            ingress: [{
            protocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
            cidrBlocks: ["108.48.101.90/32", "35.169.206.220/32"], // ⚠️ Restrict this in production
            }],
            egress: [{
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
            }],
        },{parent: this});
        
        //  Subnet group for RDS
        const dbSubnetGroup = new aws.rds.SubnetGroup("rds-subnet-group", {
            subnetIds: [subnet1.id, subnet2.id],
            tags: { Name: "rds-subnet-group" },
        },{parent: this});
        

        //  RDS Instance
        const db = new aws.rds.Instance("my-db", {
            engine: args.engine ?? "postgres",
            engineVersion: "8.0.41",
            instanceClass: args.instanceClass ?? "db.t3.micro",
            allocatedStorage: args.allocatedStorage,
            maxAllocatedStorage: args.maxAllocatedStorage,
            dbName: args.dbName,
            username: args.username,
            password: args.password,
            applyImmediately: true,
            dbSubnetGroupName: dbSubnetGroup.name,
            vpcSecurityGroupIds: [dbSg.id],
            skipFinalSnapshot: true,
            publiclyAccessible: args.publiclyAccessible ?? true,
            identifier: args.identifier

        },{parent: this});

        this.RdsAddress = db.address;

    

        this.registerOutputs({
            RdsEndpoint: this.RdsAddress
        })

    }
}

module.exports.RdsDatabase = RdsDatabase;