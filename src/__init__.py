from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager


config_dir = {
    "rhosp": {
        "RHOSP-16.0": {
            'x86_64': ["RHEL-8"],
            'ppc64le': ["RHEL-8"]
        },
        "RHOSP-16.1": {
            'x86_64': ["RHEL-8"],
            'ppc64le': ["RHEL-8"]
        }   
    },
    "ccsp": {
        "": {
            'x86_64': ["RHEL-6", "RHEL-7", "RHEL-8"],
            'aarch64': ["RHEL-6", "RHEL-7", "RHEL-8"],
            's390x': ["RHEL-6", "RHEL-7", "RHEL-8"],
            'ppc64le': ["RHEL-6", "RHEL-7", "RHEL-8"]
        }
    },
    "rhelapp": {
        "": {
            'x86_64': ["RHEL-8"],
            'aarch64': ["RHEL-8"],
            's390x': ["RHEL-8"],
            'ppc64le': ["RHEL-8"]
        }
    },
    "hardware": {
        "": {
            'x86_64': ["RHEL-6", "RHEL-7", "RHEL-8"],
            'aarch64': ["RHEL-6", "RHEL-7", "RHEL-8"],
            's390x': ["RHEL-6", "RHEL-7", "RHEL-8"],
            'ppc64le': ["RHEL-6", "RHEL-7", "RHEL-8"]
        }
    }
}

RHELS = ["RHEL-6", "RHEL-7", "RHEL-8"]
Products = ["rhosp", "ccsp", "rhelapp", "Hardware"]
Arcs = ["x86_64", "aarch64", "s390x", "ppc64le"]
Product_Versions = ["RHCERT-7.13"]
RHOS = ["RHOSP-16.0", "RHOSP-16.1"]
supported_file_extension = ["xml", "gz"]
result_base_dir_path = "/home/resut_files/"
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///{0}site.db'.format(result_base_dir_path)
app.config['SECRET_KEY'] = '3092e766d8a79953890a1c765ab6ca01'
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'

from src import routs
