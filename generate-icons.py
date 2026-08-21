#!/usr/bin/env python3
"""Generate PWA icons for Telegram Explorer"""
import struct, zlib, os

def create_png(size, bg_r, bg_g, bg_b):
    """Create a simple PNG icon with a gradient background and magnifying glass"""
    pixels = []
    center = size // 2
    
    for y in range(size):
        row = []
        for x in range(size):
            # Background gradient
            dx = x - center
            dy = y - center
            dist = (dx*dx + dy*dy) ** 0.5
            max_dist = size * 0.7
            
            # Circle shape
            if dist < size * 0.45:
                # Gradient from top-left to bottom-right
                t = (x + y) / (size * 2)
                r = int(0 + t * 0)   # #0088cc
                g = int(136 + t * 44)
                b = int(204 + t * 51)
                
                # Magnifying glass
                cx, cy = center - size*0.05, center - size*0.05
                glass_r = size * 0.18
                glass_dist = ((x - cx)**2 + (y - cy)**2) ** 0.5
                
                # Glass circle (outline)
                if abs(glass_dist - glass_r) < size * 0.03:
                    r, g, b = 255, 255, 255
                # Glass fill (slightly transparent look)
                elif glass_dist < glass_r - size * 0.03:
                    # Lighter blue inside
                    r = min(255, r + 40)
                    g = min(255, g + 40)
                    b = min(255, b + 40)
                
                # Handle
                hx = cx + glass_r * 0.7
                hy = cy + glass_r * 0.7
                handle_start_x = int(hx)
                handle_start_y = int(hy)
                handle_end_x = int(hx + size * 0.12)
                handle_end_y = int(hy + size * 0.12)
                
                # Simple handle line
                for i in range(int(size * 0.12)):
                    px = int(hx + i * 0.7)
                    py = int(hy + i * 0.7)
                    if px == x and py == y:
                        r, g, b = 255, 255, 255
                    if px+1 == x and py == y:
                        r, g, b = 255, 255, 255
                
                row.extend([r, g, b, 255])
            else:
                row.extend([0, 0, 0, 0])  # Transparent
        pixels.append(bytes(row))
    
    return encode_png(size, size, pixels)

def encode_png(width, height, rows):
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    raw = b''
    for row in rows:
        raw += b'\x00' + row
    
    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) +
            chunk(b'IDAT', zlib.compress(raw, 9)) +
            chunk(b'IEND', b''))

# Generate icons
os.makedirs('icons', exist_ok=True)

for size in [192, 512]:
    png_data = create_png(size, 0, 136, 204)
    with open(f'icons/icon-{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Generated icons/icon-{size}.png ({len(png_data)} bytes)')

print('Done!')
