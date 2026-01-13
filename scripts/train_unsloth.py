#!/usr/bin/env python3
"""
Fine-tune Qwen2.5-Coder using Unsloth on GCP.

This script is designed to run on a GCP VM with T4/A100 GPU.

Usage:
    python train_unsloth.py --data finetune_train.jsonl --model qwen-7b
"""

import argparse
import os
from pathlib import Path

# Unsloth must be imported first
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
import torch


MODEL_CONFIGS = {
    "qwen-7b": {
        "name": "unsloth/Qwen2.5-Coder-7B-Instruct-bnb-4bit",
        "max_seq_length": 4096,
        "batch_size": 2,
        "gradient_accumulation": 4,
    },
    "qwen-14b": {
        "name": "unsloth/Qwen2.5-Coder-14B-Instruct-bnb-4bit",
        "max_seq_length": 4096,
        "batch_size": 1,
        "gradient_accumulation": 8,
    },
    "qwen-32b": {
        "name": "unsloth/Qwen2.5-Coder-32B-Instruct-bnb-4bit",
        "max_seq_length": 2048,
        "batch_size": 1,
        "gradient_accumulation": 16,
    },
}


def load_model(model_key: str):
    """Load model with 4-bit quantization."""
    config = MODEL_CONFIGS[model_key]
    
    print(f"Loading {config['name']}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=config["name"],
        max_seq_length=config["max_seq_length"],
        dtype=None,  # Auto-detect
        load_in_4bit=True,
    )
    
    # Add LoRA adapters for efficient fine-tuning
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,  # LoRA rank
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )
    
    return model, tokenizer, config


def prepare_dataset(data_path: str, tokenizer):
    """Load and format the training dataset."""
    print(f"Loading dataset from {data_path}...")
    dataset = load_dataset("json", data_files=data_path, split="train")
    
    # Format function for chat template
    def format_prompt(example):
        messages = example["messages"]
        # Apply the model's chat template
        text = tokenizer.apply_chat_template(
            messages, 
            tokenize=False, 
            add_generation_prompt=False
        )
        return {"text": text}
    
    dataset = dataset.map(format_prompt, num_proc=4)
    print(f"Dataset loaded: {len(dataset)} examples")
    
    return dataset


def train(model, tokenizer, dataset, config, output_dir: str, epochs: int = 1):
    """Run the training loop."""
    
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=config["max_seq_length"],
        args=TrainingArguments(
            output_dir=output_dir,
            per_device_train_batch_size=config["batch_size"],
            gradient_accumulation_steps=config["gradient_accumulation"],
            warmup_steps=50,
            num_train_epochs=epochs,
            learning_rate=2e-4,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=10,
            save_steps=500,
            save_total_limit=3,
            optim="adamw_8bit",
            seed=42,
            report_to="none",  # Disable wandb/tensorboard
        ),
    )
    
    print("Starting training...")
    trainer.train()
    
    return trainer


def main():
    parser = argparse.ArgumentParser(description="Fine-tune Qwen with Unsloth")
    parser.add_argument("--data", type=str, required=True, help="Path to training JSONL")
    parser.add_argument("--model", type=str, default="qwen-7b", 
                        choices=list(MODEL_CONFIGS.keys()), help="Model to train")
    parser.add_argument("--output", type=str, default="./n8n-workflow-generator",
                        help="Output directory for model")
    parser.add_argument("--epochs", type=int, default=1, help="Number of epochs")
    args = parser.parse_args()
    
    # Check GPU
    if not torch.cuda.is_available():
        print("ERROR: No GPU detected!")
        return 1
    
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Load model
    model, tokenizer, config = load_model(args.model)
    
    # Prepare dataset
    dataset = prepare_dataset(args.data, tokenizer)
    
    # Train
    trainer = train(model, tokenizer, dataset, config, args.output, args.epochs)
    
    # Save final model
    print(f"Saving model to {args.output}...")
    model.save_pretrained(args.output)
    tokenizer.save_pretrained(args.output)
    
    # Also save as merged model for easier deployment
    merged_output = f"{args.output}_merged"
    print(f"Saving merged model to {merged_output}...")
    model.save_pretrained_merged(merged_output, tokenizer, save_method="merged_16bit")
    
    print("\n" + "="*50)
    print("Training complete!")
    print(f"LoRA adapter: {args.output}")
    print(f"Merged model: {merged_output}")
    print("="*50)
    
    return 0


if __name__ == "__main__":
    exit(main())
