sudo yum install -y git python3 python3-pip
python3 -m venv .fileserver; source .fileserver/bin/activate
sudo mkdir -p /home/resut_files/
sudo chmod 777 /home/resut_files/
git clone https://github.com/vipin3699/File-Server.git; cd File-Server
sudo echo -e "no" | mv src/site.db /home/resut_files/
pip install -r requirements.txt
python3 run.py
