import os
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

current_dir = os.path.dirname(os.path.abspath(__file__))

try:
    import pandas as pd
    color_mapper = None
    feature_names = None
    
    class ColorMapper:
        def __init__(self, xlsx_path):
            self.df = pd.read_excel(xlsx_path)
            self.category_colors = {}
            self.color_to_category = {}
            
            for _, row in self.df.iterrows():
                try:
                    rgb_str = str(row.iloc[5]).strip('[]() ').replace(' ', '')
                    rgb_values = [int(x) for x in rgb_str.split(',')]
                    rgb_array = np.array(rgb_values, dtype=np.uint8)
                    category_name = str(row.iloc[8])
                    self.category_colors[category_name] = rgb_array
                    self.color_to_category[tuple(rgb_array)] = category_name
                except:
                    continue

        def get_color_category(self, color):
            return self.color_to_category.get(tuple(color))
    
    color_mapper = ColorMapper(os.path.join(current_dir, 'color_coding_semantic_segmentation_classes - Sheet1.xlsx'))
    
    with open(os.path.join(current_dir, 'feature_names_142.txt'), 'r') as f:
        feature_names = [line.strip() for line in f.readlines()]
    
    print("颜色映射加载成功")
    print(f"特征数量: {len(feature_names)}")
    
except Exception as e:
    print(f"加载映射表出错: {str(e)}")
    color_mapper = None
    feature_names = None

app = Flask(__name__)
CORS(app)

CRIME_WEIGHTS = {
    'ppl': 0.12,
    'sidewalk': 0.08,
    'road.route': 0.05,
    'wall': 0.04,
    'fence.fencing': 0.05,
    'sign': 0.03,
    'car.auto.automobile.machine.motorcar': 0.04,
    'building.edifice': -0.04,
    'door.double.door': 0.02,
    'windowpane.window': -0.02,
    'earth.ground': 0.03,
    'rock.stone': 0.02,
    'sky': -0.05,
    'tree': -0.04,
    'lamp': -0.06,
    'grass': -0.03,
    'field': -0.02,
    'mountain.mount': -0.02,
    'sea': -0.02,
    'water': -0.02,
    'sand': 0.01,
    'bed': -0.01,
    'table': -0.01,
    'chair': -0.01,
    'cabinet': -0.01,
    'desk': -0.01,
    'sofa.couch.lounge': -0.01,
    'shelf': -0.01,
    'house': -0.02,
    'skyscraper': -0.01,
    'painting.picture': -0.01,
    'box': 0.01,
    'column.pillar': 0.01,
    'chest.of.drawers.chest.bureau.dresser': -0.01,
    'counter': 0.01,
    'base.pedestal.stand': 0.01,
    'cushion': -0.01,
    'armchair': -0.01,
    'seat': -0.01,
    'railing.rail': 0.01,
    'ceiling': -0.01,
    'floor.flooring': 0.01,
    'bathtub.bathing.tub.bath.tub': -0.01,
    'sink': -0.01,
    'curtain.drape.drapery.mantle.pall': -0.01,
    'mirror': -0.01,
    'rug.carpet.carpeting': -0.01,
}

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('static/js', filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('static/images', filename)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        rgb_ratios = data['features']
        
        feature_dict = {name: 0.0 for name in feature_names} if feature_names else {}
        
        if color_mapper and feature_names:
            for feature in rgb_ratios:
                rgb_array = np.array([feature['r'], feature['g'], feature['b']], dtype=np.uint8)
                category = color_mapper.get_color_category(rgb_array)
                if category and category in feature_dict:
                    feature_dict[category] += feature['ratio']
        
        crime_score = 0.0
        total_matched = 0.0
        
        for category, ratio in feature_dict.items():
            if ratio > 0 and category in CRIME_WEIGHTS:
                crime_score += ratio * CRIME_WEIGHTS[category]
                total_matched += ratio
        
        base_rate = 0.08
        
        if total_matched > 0:
            avg_impact = crime_score / total_matched
            crime_rate = base_rate + avg_impact * 0.5
            crime_rate = max(0.03, min(0.30, crime_rate))
        else:
            crime_rate = base_rate
        
        log_crime_rate = np.log(crime_rate)
        
        return jsonify({
            'status': 'success',
            'prediction': float(log_crime_rate),
            'crime_rate': float(crime_rate * 100)
        })
        
    except Exception as e:
        print(f"预测错误: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
