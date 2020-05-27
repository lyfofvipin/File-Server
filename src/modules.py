import os
from src import supported_file_extension

def list_dirs(result_base_dir_path):
    for files in os.listdir(result_base_dir_path):
        file_path = os.path.join( result_base_dir_path + files)
        if os.path.isdir(file_path): yield files

def file_validater(file_name):
    return True if file_name[-3:] in supported_file_extension or file_name[-2:] in supported_file_extension else False