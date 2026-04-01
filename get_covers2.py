import urllib.request
import json
import ssl
import sys
from urllib.parse import quote
import time

ssl._create_default_https_context = ssl._create_unverified_context

books = [
    ("Corte de Espinhos e Rosas", "Sarah J. Maas"),
    ("Corte de Névoa e Fúria", "Sarah J. Maas"),
    ("Corte de Asas e Ruína", "Sarah J. Maas"),
    ("É Assim Que Acaba", "Colleen Hoover"),
    ("Verity", "Colleen Hoover"),
    ("A Hipótese do Amor", "Ali Hazelwood"),
    ("Melhor do Que nos Filmes", "Lynn Painter"),
    ("A Acompanhante", "Freida McFadden"),
    ("Uma Corte Tão Sombria", "Rachel Gillig"),
    ("Casa de Terra e Sangue", "Sarah J. Maas"),
    ("Trono de Vidro", "Sarah J. Maas"),
    ("Todas as Suas Imperfeições", "Colleen Hoover"),
    ("E Não Sobrou Nenhum", "Agatha Christie"),
    ("A Culpa é das Estrelas", "John Green")
]

for title, author in books:
    query = quote(f"{title} {author}")
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&langRestrict=pt"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req)
        data = json.loads(response.read())
        
        found = False
        if 'items' in data:
            for item in data['items']:
                if 'imageLinks' in item['volumeInfo']:
                    image_url = item['volumeInfo']['imageLinks'].get('thumbnail', '')
                    image_url = image_url.replace('http:', 'https:').replace('&edge=curl', '')
                    print(f"'{title}': '{image_url}',")
                    found = True
                    break
        if not found:
            print(f"'{title}': 'NOT FOUND',")
    except Exception as e:
        print(f"Failed for {title}: {e}")
    time.sleep(1)

