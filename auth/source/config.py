# src/config/config.py
import os
from datetime import timedelta

class Config:
    """Base configuration"""
    
    # Basic Flask Config
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # API Configuration
    API_TITLE = 'Resource Manager API'
    API_VERSION = 'v1'
    OPENAPI_VERSION = '3.0.3'
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///resource_manager.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True
    }
    
    # Security
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',') or ['http://localhost:3000']
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Service Configuration
    SERVICE_NAME = 'resource-manager'
    SERVICE_VERSION = '1.0.0'
    
    # External Services
    AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://auth-service:5000')
    MONITORING_SERVICE_URL = os.environ.get('MONITORING_SERVICE_URL', 'http://monitoring-service:5000')
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'memory://')
    RATELIMIT_STRATEGY = 'fixed-window'
    
    # Cache Configuration
    CACHE_TYPE = 'RedisCache'
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = 300
    
    # Message Queue
    RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/')
    
    # Cloud Provider Specific
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
    AZURE_SUBSCRIPTION_ID = os.environ.get('AZURE_SUBSCRIPTION_ID', '')
    GCP_PROJECT_ID = os.environ.get('GCP_PROJECT_ID', '')
    
    # Resource Limits
    MAX_RESOURCES_PER_USER = int(os.environ.get('MAX_RESOURCES_PER_USER', '100'))
    DEFAULT_RESOURCE_TIMEOUT = int(os.environ.get('DEFAULT_RESOURCE_TIMEOUT', '3600'))


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
    # Development-specific database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'mysql+mysqldb://root:mysqlpassword123@localhost/orchestratorAuth'
    )
    
    # More verbose logging
    LOG_LEVEL = 'DEBUG'
    
    # Disable caching in development
    CACHE_TYPE = 'SimpleCache'
    CACHE_DEFAULT_TIMEOUT = 60
    
    # Allow longer tokens for development
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    
    # Use in-memory SQLite for tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Disable CSRF protection in tests
    WTF_CSRF_ENABLED = False
    
    # Faster token expiration for tests
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    
    # Mock external services
    AUTH_SERVICE_URL = 'http://mock-auth:5000'
    
    # Use simple cache for tests
    CACHE_TYPE = 'SimpleCache'


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Production database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://user:password@production-db:5432/resource_manager_prod'
    )
    
    # Security settings for production
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True
    
    # Production logging
    LOG_LEVEL = 'WARNING'
    
    # Shorter token expiration for security
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    
    # Strict CORS in production
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')


class DockerConfig(DevelopmentConfig):
    """Docker-specific configuration"""
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'postgresql://user:password@db:5432/resource_manager'
    )
    
    # Use service names for inter-container communication
    AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://auth-service:5000')
    RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'docker': DockerConfig,
    'default': DevelopmentConfig
}


def get_config():
    """Get configuration based on environment"""
    env = os.environ.get('FLASK_ENV', 'development')
    return config.get(env, config['default'])