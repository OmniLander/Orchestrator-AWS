import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def sg_in_existance():
    try:
        sg_resource = boto3.client('ec2')
        response = sg_resource.describe_security_groups()
        
        security_groups = {}
        ip_protocols = {}

        for sg in response['SecurityGroups']:
            sg_id = sg['GroupId']
            sg_vpcId = sg['VpcId']
            sg_desc = sg.get('Description', 'N/A')
            sg_gn = sg['GroupName']
        
            
            for permit in sg['IpPermissions']:
                sg_protocol = permit['IpProtocol']    
                sg_from_port =permit.get('FromPort', 'N/A')
                sg_to_port =permit.get('ToPort', 'N/A')
                
                ip_protocols[sg_protocol] = {
                    "Exit_port" : sg_from_port,
                    "Enter_port" : sg_to_port
                }

            security_groups[sg_id] = {
                "VPC_it_belongs": sg_vpcId,
                "Group_Name": sg_gn,
                "Group_description":sg_desc,
                "Group_permits": ip_protocols
            }

        return security_groups
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None

def sgr_id():
    try: 
        sg_resource = boto3.client('ec2')
        response = sg_resource.describe_security_group_rules()
        
        sgrs = {}

        for sgr in response['SecurityGroupRules']:
            sgr_gid = sgr['GroupId']
            sgr_id = sgr['SecurityGroupRuleId']
            sgr_dir = 'Egress' if sgr['IsEgress'] else 'Ingress'
            sgr_protocol = sgr.get('IpProtocol', 'N/A')
            sgr_from_port = sgr.get('FromPort', 'N/A')
            sgr_to_port = sgr.get('ToPort', 'N/A')
            sgr_cidr = sgr.get('CidrIpv4', sgr.get('CidrIpv6', 'N/A'))
            sgr_referenced_group = sgr.get('ReferencedGroupInfo', {}).get('GroupId', 'N/A')

            if sgr_gid not in sgrs:
                sgrs[sgr_gid] = []
            
            sgrs[sgr_gid].append({
                'rule_id': sgr_id,
                'direction': sgr_dir,
                'protocol': sgr_protocol,
                'from_port': sgr_from_port,
                'to_port': sgr_to_port,
                'cidr': sgr_cidr,
                'referenced_group': sgr_referenced_group
            })

        return sgrs
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None
