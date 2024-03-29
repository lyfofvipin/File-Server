from src import app, port
import os

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=port)
