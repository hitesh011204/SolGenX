import requests

api_key = "YTL83BF454EVI0G5"

# Your solar data
Battary voltage = 10.7       # Field 1
current = 5.7        # Field 2
power = voltage * current   # Field 3
azimuth = 50         # Field 4
Elevation    # Field 5
Solar voltage

# Create URL with all fields
url = f"https://api.thingspeak.com/update?api_key={api_key}&field1={voltage}&field2={current}&field3={power}&field4={azimuth}&field5={timestamp}"

# Send request
response = requests.get(url)

if response.status_code == 200:
    print("Data stored successfully!")
else:
    print("Error sending data")