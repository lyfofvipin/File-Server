import os
from src import supported_file_extension

def list_dirs(result_base_dir_path):
    for files in os.listdir(result_base_dir_path):
        file_path = os.path.join( result_base_dir_path + files)
        if os.path.isdir(file_path): yield files

def file_validater(file_name):
    if not supported_file_extension: return True
    return True if file_name[-3:] in supported_file_extension or file_name[-2:] in supported_file_extension else False

def get_value(item):
    return item if item else ""

def find_files(file_to_replace, root_dir):
    available_files = []
    for root, dirs, files in os.walk(root_dir):
        if file_to_replace in files:
            available_files.append(os.path.join(root, file_to_replace).replace(root_dir, ""))
    print("Find files : " + str(available_files))
    return available_files
