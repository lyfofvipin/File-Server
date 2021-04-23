from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager


config_dir = {
    "Product1": {
        "Sub_Product1": {
            'category1': ["sub_category_1", "sub_category_2", "sub_category_3", "sub_category_4"],
            'category2': ["sub_category_1", "sub_category_2", "sub_category_3", "sub_category_4"],
            'category3': ["sub_category_1", "sub_category_2", "sub_category_3", "sub_category_4"],
            'category4': ["sub_category_1", "sub_category_2", "sub_category_3", "sub_category_4"]
        },
        "Sub_Product2": {
            'category1': ["sub_category_1"],
            'category2': ["sub_category_1"]
        }   
    },
    "Product2": {
        "": {
            'category1': []
        }
    },
    "Product3": {
        "": {}
    },
}

Sub_Categories = ["sub_category_1", "sub_category_2", "sub_category_3", "sub_category_4"],
Products = ["Sub_Product1", "Sub_Product2", "Product3"]
Categories = ["category1", "category2", "category3", "category4"]
Product_Versions = ["01"]
Sub_Product_Versions = ["Sub_Product1", "Sub_Product2"]
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
