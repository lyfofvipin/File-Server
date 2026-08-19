sudo yum install -y git python3 python3-pip
python3 -m venv .fileserver; source .fileserver/bin/activate
sudo mkdir -p /home/dir_to_share/
sudo chmod 777 /home/dir_to_share/
git clone https://github.com/lyfofvipin/File-Server.git; cd File-Server

# Start Backend 
cd backend && pip install -r requirements.txt && python3 run.py

# Start Frontend
cd frontend && python3 serve.py
