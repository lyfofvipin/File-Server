config_dir = {
    "Product1": {
        "Sub_Product1": {
            'category1': ["sub_category_1", "sub_category_2", "sub_category_3", "sub_category_4"],
            'category2': ["sub_category_1", "sub_category_2", "sub_category_3"],
            'category3': ["sub_category_1", "sub_category_2"],
            'category4': ["sub_category_1"]
        },
        "Sub_Product2": {
            'category1': ["sub_category_1"],
            'category2': ["sub_category_1"]
        },
        "": {
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
    "Product4": {
    },
}

Product_Versions = ["01", "02"]
supported_file_extension = ["xml", "gz"]
result_base_dir_path = "/home/resut_files/"
open_in_browser = False
create_file_structure = True
port = "5000"
