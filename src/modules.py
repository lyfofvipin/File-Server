import os
from src import supported_file_extension
convert_to_url = lambda x : '<a href="{0}">{1}</a>'.format(x,x)
description_file_name = ".file_server/{0}.text"
description_dir_name = ".file_server"


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

def get_the_description(path, folder_content, called_from="gui"):
    file_descriptions = []
    for x in folder_content:
        if called_from == "gui":
            description_file_path = os.path.join(path, description_file_name.format(x[0]))
        else:
            description_file_path = os.path.join(path, description_file_name.format(x))
        if os.path.exists(description_file_path):
            with open(description_file_path) as desc_file:
                description = desc_file.read()
                if called_from == "gui":
                    description = " ".join([  convert_to_url(x) if x.startswith("http") else x for x in description.split() ])
            file_descriptions.append(description)
        else:
            file_descriptions.append("")
    return file_descriptions

def set_the_description(file_path, file_name, comment):
    file_path_with_no_file_name = file_path.replace(file_name, "")
    if not os.path.exists(os.path.join(file_path_with_no_file_name, description_dir_name)):
        os.mkdir(os.path.join(file_path_with_no_file_name, description_dir_name))
    with open(os.path.join(file_path_with_no_file_name, description_file_name.format(file_name)), 'w+') as description_file:
        description_file.write(comment)
