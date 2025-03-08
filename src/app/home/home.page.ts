import { Component, OnInit } from '@angular/core';
import { Client } from '@gradio/client';
import { AudioService } from '../service/audio.service';
import { Filesystem, Directory, Encoding, FilesystemDirectory } from '@capacitor/filesystem';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { ImageHandlerService } from '../service/image.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone:false,
})
export class HomePage implements OnInit {
  selectedFile: File | null = null;
  processedImage: string | null = null;
  selectedImage!: string;
  urduText: any;
  englishTranslation: any;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];

      // Show the selected image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImage = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async processImage() {
    if (!this.selectedFile) return;

    try {
      // Convert the file to a Blob
      const fileBlob = new Blob([await this.selectedFile.arrayBuffer()], { type: this.selectedFile.type });

      // Connect to Gradio API
      const client = await Client.connect("not-lain/background-removal");

      // Send image to Gradio API
      const result:any = await client.predict("/image", { image: fileBlob });

      // Extract processed image URL
      const imageUrl = result?.data[0][0].url;
      this.processedImage = imageUrl;

    } catch (error) {
      console.error("Error processing image:", error);
    }
  }



  async downloadImage() {
    try {
      if (!this.processedImage) {
        throw new Error('No processed image URL found');
      }

      // Fetch the image as a blob
      const response = await fetch(this.processedImage);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Convert blob to base64 using async function
      const base64String = await this.convertBase(blob);

      if (!base64String) {
        throw new Error('Failed to convert image to base64');
      }

      // ✅ Save image as JPG using Filesystem
        const fileName = `processed_image_${Date.now()}.jpg`
    const file=  await Filesystem.writeFile({
        path: fileName,
        data: base64String,
        directory: FilesystemDirectory.Documents,
      });
      const uri=file.uri
      this.fileOpener
      .open(uri, 'image/jpeg')
      .then(() => console.log('✅ Image opened successfully!'))
      .catch(() => console.error('❌ Error opening file:'));

      console.log('✅ Image downloaded successfully!',file);
    } catch (error) {
      console.error('❌ Error downloading image:', error);
    }
  }


  // ✅ Convert Blob to Base64 using a Promise
  private convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob); // Convert blob to Base64

      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1]; // Remove metadata
        resolve(base64String || '');
      };

      reader.onerror = (error) => reject(error);
    });
  }

  convertBase = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const base64String = reader.result?.toString().split(',')[1]; // Remove metadata
        resolve(base64String || '');
      };
      reader.readAsDataURL(blob);
    });

  isRecording = false;
  audioUrl: string = '';
  processedImage1: string =
  'https://not-lain-background-removal.hf.space/file=/tmp/gradio/e6ffdfd8d03607be1c6c2f417c3058c4d378d75192b9140381fc6d73a9e9c2d1/image.webp';


  constructor(private audioService: AudioService,private fileOpener: FileOpener,private imagehandler:ImageHandlerService) {}
  ngOnInit(): void {
   this.imagehandler.downloadAndOpenImage(this.processedImage1)
  }


  // async startRecording() {
  //   this.isRecording = true;
  //   await this.audioService.startRecording();
  // }

  // async stopRecording() {
  //   this.isRecording = false;
  //   const audioBlob = await this.audioService.stopRecording();
  //   this.audioUrl = URL.createObjectURL(audioBlob);
  // }

  // async sendAudio() {
  //   const audioBlob = await this.audioService.stopRecording();
  //   const buffer = await audioBlob.arrayBuffer();
  //   const exampleAudio = new Blob([buffer], { type: 'audio/wav' });

  //   const client = await Client.connect('hussainraza/Urdu-English-Translator');
  //   const result = await client.predict('/predict', { audio_path: exampleAudio });
  //   if (Array.isArray(result.data) && result.data.length >= 2) {
  //     this.urduText = result.data[0];
  //     this.englishTranslation = result.data[1].replace('The translation of the Urdu sentence to English is:\n\n', '').trim();
  //   }
  //   console.log(result.data); // Display Transcribed Text
  // }

  async startRecording() {
    this.isRecording = true;
    await this.audioService.startRecording();
  }


  async stopRecording() {
    this.isRecording = false;
    const audioBlob = await this.audioService.stopRecording();
    if (audioBlob) {
      this.audioUrl = URL.createObjectURL(audioBlob);
    }
  }

  async sendAudio() {
    const audioBlob = await this.audioService.getRecordedAudio();
    if (!audioBlob) return;

    const buffer = await audioBlob.arrayBuffer();
    debugger
    const exampleAudio = new Blob([buffer], { type: 'audio/wav' });

    const client = await Client.connect('hussainraza/Urdu-English-Translator');
    const result = await client.predict('/predict', { audio_path: exampleAudio });

    if (Array.isArray(result.data) && result.data.length >= 2) {
      this.urduText = result.data[0];
      this.englishTranslation = result.data[1].replace('The translation of the Urdu sentence to English is:\n\n', '').trim();
    }
    console.log(result.data);
  }

}
