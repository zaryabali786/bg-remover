import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Filesystem, Directory, Encoding, FilesystemDirectory } from '@capacitor/filesystem';
import { FileOpener } from '@ionic-native/file-opener/ngx';

@Injectable({
  providedIn: 'root',
})
export class ImageHandlerService {
  downloadProgress = 0;

  constructor(private http: HttpClient, private fileOpener: FileOpener) {}

  // 🔹 Convert Blob to Base64
  private async convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1]; // Extract raw Base64 data
        resolve(base64String || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // 🔹 Convert WebP to JPG using Canvas
  private async convertWebPToJPG(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Canvas rendering context not supported');
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((jpgBlob) => {
          if (jpgBlob) resolve(jpgBlob);
          else reject('Failed to convert image');
        }, 'image/jpeg', 0.9);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  // 🔹 Download, Convert, Save & Open Image
  downloadAndOpenImage(imageUrl: string) {
    this.http
      .get(imageUrl, {
        responseType: 'blob', // Fetch as blob
        reportProgress: true,
        observe: 'events', // Observe progress
      })
      .subscribe(async (event:any) => {
        if (event.type === HttpEventType.DownloadProgress && event.total) {
          // ✅ Track download progress
          this.downloadProgress = Math.round((100 * event.loaded) / event.total);
          console.log(`Download Progress: ${this.downloadProgress}%`);
        } else if (event.type === HttpEventType.Response) {
          // ✅ Reset progress
          this.downloadProgress = 0;

          // ✅ Convert WebP to JPG
          const jpgBlob = await this.convertWebPToJPG(event.body);

          // ✅ Convert JPG Blob to Base64
          const base64String = await this.convertBlobToBase64(jpgBlob);

          if (!base64String) {
            throw new Error('Failed to convert image to base64');
          }

          // ✅ Set Filename for JPG
          const fileName = `processed_${Date.now()}.jpg`;

          // ✅ Save image as JPG using Filesystem
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64String,
             directory: FilesystemDirectory.Documents,
          });

          const filePath = savedFile.uri; // ✅ Get file URI

          console.log('✅ Image saved successfully at:', filePath);

          // ✅ Open the saved file using FileOpener
          this.fileOpener
            .open(filePath, 'image/jpeg')
            .then(() => console.log('✅ Image opened successfully!'))
            .catch((error) => console.error('❌ Error opening file:', error));
        }
      });
  }
}
