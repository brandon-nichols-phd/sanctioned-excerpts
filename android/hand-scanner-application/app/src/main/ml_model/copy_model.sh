#!/usr/bin/python3
import torch
import argparse
import sys
import os
from torch.utils.mobile_optimizer import  optimize_for_mobile
parser = argparse.ArgumentParser("Convert and copy torch model to android dir")
parser.add_argument("dir", help="directory to find model.pt in")

args = parser.parse_args()

model = torch.jit.load(os.path.join(args.dir, "model.pt"))
try:
	torch.quantization.fuse_modules(model, [['conv', 'bn', 'relu']], inplace=True)
except:
	print("Could not quantize model")

model = model.to(memory_format=torch.channels_last)

model = optimize_for_mobile(model)


model._save_for_lite_interpreter("model.pt")