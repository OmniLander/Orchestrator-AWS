import boto3
import requests
from botocore.exceptions import NoCredentialsError, ClientError

def ec2_in_existance():
    try:
        ec2_resource = boto3.client('ec2')
        response = ec2_resource.describe_instances()
        
        ec2 = {}

        for ec2_ins in response['Reservations']:
            for instance in ec2_ins['Instances']:
                ec2_id = instance['InstanceId']
                ec2_state = instance['State']['Name']
                ec2_Ip = instance.get('PrivateIpAddress', 'N/A')
                ec2_type = instance['InstanceType']
                ec2_vpc = instance.get('VpcId', 'N/A')
                
                #Get name from Tags
                ec2_name = "No name"
                if 'Tags' in instance:
                    for tag in instance['Tags']:
                        if tag['Key'] == 'Name':
                            ec2_name = tag['Value']
                            break

            ec2[ec2_id] = {
                'Instance_name': ec2_name, 
                'State': ec2_state,
                'Ip_address': ec2_Ip,
                'Instance_type': ec2_type,
                'VPC' : ec2_vpc
            }

        return ec2

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None