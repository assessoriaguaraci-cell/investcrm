import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = "https://itunes.apple.com/search?media=ebook&term=corte+de+espinhos+e+rosas"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
response = urllib.request.urlopen(req)
data = json.loads(response.read())

for item in data.get('results', []):
    print(item.get('trackName'))
    print(item.get('artworkUrl100').replace('100x100bb', '600x600bb'))
    break
