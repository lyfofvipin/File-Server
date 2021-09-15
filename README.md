# File-Server

This application is developed for sharing files between multiple teams.
We have 2 type of user in this application one has a role of QE ( Tester ) and anther has role of developer, A user with QE role can upload files and downloads but a user with developer access can only download files. The application by default support only `.xml` and `.gz` file but you can always add more type by changing the values in [\_\_init\_\_.py](https://github.com/vipin3699/File-Server/blob/master/src/__init__.py).
This app is developed using Python's Flask module.
The work of this app is very simple It let you Upload, download and Replace Files ( via WUI, CLI and API's ).

# A Simple UseCase

In our case my teams are working in different regions across the globe so we need to share some result files with the developers and tester so we use it's WUI to share files with them,. In our Automaton we use it's CLI feature to pass the flags and Perform operations on the files. App has API's those are running on the Server so user can hit them also for Uploading and Downloading files.


## Deployment Step
To deploy the app you can run this [script](https://github.com/vipin3699/File-Server/blob/master/deploy_on_host.sh) or if you want to deploy on container then use this [script](https://github.com/vipin3699/File-Server/blob/master/deploy_in_container.sh).

## Available URL
`/` or `/home`  This URL will show all the **directories** available in `result_base_dir_path` variable in [file](https://github.com/vipin3699/File-Server/blob/master/src/__init__.py).

`/about`    This URL will show you the about page currently It's just the application description and the Documentation.

`/account`  This URL will show you the information of specific User.

`/upload`   This URL will only visible to User with QE role and from here you can upload files. (Auth Required)

`/login`    This URL will take you to login page and ask you to enter _username_ and _password_.

`/register` This URL will help you in registering a new User.

`/home/<path:>` This URL is a dynamic URL It based on the file and directories available in system. (Auth Required)

`/replace` This URL will use to replace a file which is already on the File Server. (Auth Required)


## Available API
`/api`      This API will give similar output as `/home` but in JSON format.

`/api/download` This API will list all the files available for download on the basic of given parameters and can download any file for you. (Auth Required)

`/api/upload`   This API will upload file on the basic of given parameters. (Auth Required)

`/api/replace`   This API will Replace file on the File Server. (Auth Required)

### Available parameters for APIs


Products --> `It could be any string contains Product Names`

**Example product Product2**

Product Versions --> `It could be any string contain Product version like 01, 02 or any Values ..`

**Example version 01**

Sub Product Names -->  `It could be any string contain Sub Product Names`

**Example sub_prod Sub_Product1**

Category Name --> `It could be any string contain Category Names`

**Example Category category4**

Sub Category Names --> `It could be any string contains Sub Category Names`

**Example sub_category sub_category_3**

File Names --> This could be any name available on system which you want to upload or download.

**Example file file_name.[xml|gz]**

While downloading file you can pass file number also

**Example file 1**

file_to_replace --> For Replace API we use this option to give the name of the file we want to replace.

**Example file_to_replace file_name.[xml|gz]**

new_file --> This option is again used by replace api to pass the new file.

**Example new_file file_name.[xml|gz]**

file_number --> This option is optional for replace api. ( If you have more then one file on the File Server use this to pass the file number. )

**Example file_number 1**

## Setup CLI

Below command will setup CLI for you

*NOTE: CLI is not supported on Windows as of now.*

`sudo curl https://raw.githubusercontent.com/vipin3699/File-Server/master/src/file_server -o /usr/bin/file-server; sudo chmod 777 /usr/bin/file-server`

Once you are done with CLI setup command update the `Fs_Host` value in file `/usr/bin/file-server` with the IP/Hostname of server where the File-Server is hosted :)

## How CLI Works
Help for the command `file-server`
```
Hiting API's at : http://localhost:5000/api
Usage: file_server [OPTIONS] COMMAND [ARGS]...

Options:
  --help  Show this message and exit.

Commands:
  download  This option is use to download files.
  replace   This option is use to replace a file on the File Server.
  upload    This option is use to upload files.
```

Help for replace Command:

```
[vipikuma@kvy File-Server]$ file_server replace --help
Usage: file_server replace [OPTIONS]

  This option is use to replace a file on the File Server.

Options:
  -P, --password TEXT      Pass User Password or you can export as variable
                           FS_PASSWORD

  -U, --username TEXT      Pass Username or you can export as variable
                           FS_USERNAME

  -o, --old_file TEXT      Pass Old file name you want to replace.
  -f, --file_name TEXT     New file you want to upload
  -fn, --file_number TEXT  This is a optional flag if there are multiple files
                           with the same name then you can use this to pass
                           the file number you want to replace.

  --help                   Show this message and exit.
```

### Examples:
Here are the examples of command `file-server` for download, upload and replacing files:

Note: *I have export the username and passwords as Shell Environment Variables so I am not using -P and -U flags.*

#### Listing and Downloading files:
Listing all Products:
```
[vipikuma@kvy File-Server]$ file_server download
{
  "aviable_data_on_path": [
    "Product1", 
    "Product3", 
    "Product2"
  ]
}
```

Listing files of a specific Product:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 download
'{
  "aviable_data_on_path": [
    "02", 
    "01"
  ]
}
```

Listing files of a specific Product Version:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 02 download
{
  "aviable_data_on_path": [
    "Sub_Product1", 
    "Sub_Product2"
  ]
}
```

Listing files of a specific Sub Product:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 02 --sub_prod Sub_Product1 download
{
  "aviable_data_on_path": [
    "category3", 
    "category4", 
    "category2", 
    "category1"
  ]
}
```

Listing files of a specific Category:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 02 --sub_prod Sub_Product1 --category category4 download
{
  "aviable_data_on_path": [
    "sub_category_2", 
    "sub_category_3", 
    "sub_category_1", 
    "sub_category_4"
  ]
}
```

Listing files of a specific Sub Category:
If you don't have any files on given values it will return a blank string.

```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 02 --sub_prod Sub_Product1 --category category4 --sub_category sub_category_3 download
{
  "aviable_data_on_path": []
}
```

```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 01 --sub_prod Sub_Product1 --category category1 --sub_category sub_category_1 download
{
  "aviable_data_on_path": [
    "file1.xml.gz", 
    "Dockerfile.gz"
  ]
}
```

Downloading files from the File Server:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 01 --sub_prod Sub_Product1 --category category1 --sub_category sub_category_1 --file Dockerfile.gz download
Downloading......
Download Compleat
```

#### Uploading files via CLI:

Uploading files to a specific Product:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 --file file1.xml upload
Uploading......
{
  "message": "File Uploaded successfully"
}
```

Uploading files to a specific Product Version:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 01 --file file1.xml upload
Uploading......
{
  "message": "File Uploaded successfully"
}
```

Uploading files to a specific Sub Product:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 01 --sub_prod Sub_Product2 --file file1.xml upload
Uploading......
{
  "message": "File Uploaded successfully"
}
```

Uploading files to a specific Category:
```
file_server --product Product1 --version 01 --sub_prod Sub_Product1 --category category3 --file file1.xml upload
Uploading......
{
  "message": "File Uploaded successfully"
}
```

Uploading files to a specific Sub Category:
```
[vipikuma@kvy File-Server]$ file_server --product Product1 --version 01 --sub_prod Sub_Product1 --category category3 --sub_category sub_category_3 --file file1.xml upload
Uploading......
{
  "message": "File Uploaded successfully"
}
```

What if you miss some parameters like here I am trying to upload a file with wrong values.
```
file_server --product Product1 --version 01 --sub_prod Sub_Product1 --sub_category sub_category_3 --file file1.xml upload
Uploading......
{
  "Message": "Looks like you enter something wrong. Please try again.", 
  "Supported Version": {
    "Product1": {
      "Sub_Product1": {
        "category1": [
          "sub_category_1", 
          "sub_category_2", 
          "sub_category_3", 
          "sub_category_4"
        ], 
        "category2": [
          "sub_category_1", 
          "sub_category_2", 
          "sub_category_3", 
          "sub_category_4"
        ], 
        "category3": [
          "sub_category_1", 
          "sub_category_2", 
          "sub_category_3", 
          "sub_category_4"
        ], 
        "category4": [
          "sub_category_1", 
          "sub_category_2", 
          "sub_category_3", 
          "sub_category_4"
        ]
      }, 
      "Sub_Product2": {
        "category1": [
          "sub_category_1"
        ], 
        "category2": [
          "sub_category_1"
        ]
      }
    }, 
    "Product2": {
      "": {
        "category1": []
      }
    }, 
    "Product3": {
      "": {}
    }
  }
}

```

#### Replacing files via CLI:

Replacing File if multiple files available on the server:

In such kind of scenario you need to pass 
```
[vipikuma@kvy File-Server]$ file_server replace --old_file file1.xml --file_name file2.xml 
Replacing file2.xml ....
{
  "Found multiple files, pass the `file_number` with which you want to replace the file from the given list: ": [
    "1 --> Product1/file1.xml", 
    "2 --> Product1/01/file1.xml", 
    "3 --> Product1/01/Sub_Product1/category3/file1.xml", 
    "4 --> Product1/01/Sub_Product1/category3/sub_category_3/file1.xml", 
    "5 --> Product1/01/Sub_Product2/file1.xml"
  ]
}
```

Using __file_number__ to replace a specific file:
```
[vipikuma@kvy File-Server]$ file_server replace --old_file file1.xml --file_number 5 --file_name file2.xml 
Replacing file2.xml ....
{
  "message": "File Replaced Successfully."
}
```

```
[vipikuma@kvy File-Server]$ file_server replace --old_file file1.xml --file_name file2.xml 
Replacing file2.xml ....
{
  "Found multiple files, pass the `file_number` with which you want to replace the file from the given list: ": [
    "1 --> Product1/file1.xml", 
    "2 --> Product1/01/file1.xml", 
    "3 --> Product1/01/Sub_Product1/category3/file1.xml", 
    "4 --> Product1/01/Sub_Product1/category3/sub_category_3/file1.xml"
  ]
}
```

If you only have 1 file available then it will auto replace that file without __file_number__ parameter.
```
[vipikuma@kvy File-Server]$ file_server replace --old_file file2.xml --file_name file3.xml 
Replacing file3.xml ....
{
  "message": "File Replaced Successfully."
}
```

If the file is not on the FileServer:
```
[vipikuma@kvy File-Server]$ file_server replace --old_file file8.xml --file_name file3.xml 
Replacing file3.xml ....
{
  "message": "File not found on the File Server."
}
```
