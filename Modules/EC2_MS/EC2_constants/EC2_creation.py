import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_ec2(ImageId, MaxCount, KeyName, SecurityGroupIds):
    try:
        ec2_client = boto3.client('ec2')
        response = ec2_client.run_instances(
            ImageId='ami-0d94dbac91470f54c',  # Replace with a valid AMI ID for your region
            InstanceType='t3.medium',
            MinCount=1,
            MaxCount=1,
            #KeyName='', # Replace with your key pair name
            #SecurityGroupIds=[''], # Replace with your security group ID
            SubnetId='subnet-089ebe27c59c481b3'   
        )
        print(response)
        return
    except:
        return
    
create_ec2()#