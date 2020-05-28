import os
from flask import jsonify, request, send_from_directory
from src import app, db, result_base_dir_path, Products, Arcs, Product_Versions, RHELS, RHOS
from src.modules import list_dirs, file_validater


def home_page_api():
    folder_list = list_dirs(result_base_dir_path)
    return jsonify({ "products": [ product for product in folder_list]})