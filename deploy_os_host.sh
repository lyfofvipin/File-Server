sudo yum install -y git pytohn3-pip 
sudo mkdir -p /home/resut_files/
sudo chmod 777 /home/resut_files/
pip install virtualenv
git clone https://github.com/vipin3699/File-Server.git
pip install -r File-Server/requirements.txt
python3 File-Server/run.py
