## Basic model info

Model name: kwaivgi/kling-v2.1
Model description: Use Kling v2.1 to generate 5s and 10s videos in 720p and 1080p resolution from a starting image (image-to-video)


## Model inputs

- mode (optional): Standard has a resolution of 720p, pro is 1080p. Both are 24fps. (string)
- duration (optional): Duration of the video in seconds (integer)
- prompt (required): Text prompt for video generation (string)
- end_image (optional): Last frame of the video (pro mode is required when this parameter is set) (string)
- start_image (required): First frame of the video. You must use a start image with kling-v2.1. (string)
- negative_prompt (optional): Things you do not want to see in the video (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/7v2d7djbn1rma0cqh6rbxwpxv0)

#### Input

```json
{
  "mode": "standard",
  "prompt": "a woman points at the words",
  "duration": 5,
  "start_image": "https://replicate.delivery/xezq/rfKExHkg7L2UAyYNJj3p1YrW1M3ZROTQQXupJSOyM5RkwQcKA/tmpowaafuyw.png",
  "negative_prompt": ""
}
```

#### Output

```json
"https://replicate.delivery/xezq/ueemmhGfowaxnp2zx4rQAwZWkIGMkeoEFGwDMB8FJDDUPGiTB/tmpsam6b5v3.mp4"
```


### Example (https://replicate.com/p/a5fszgjzvdrmc0cqh6srsz53g4)

#### Input

```json
{
  "mode": "standard",
  "prompt": "a woman takes her hands out her pockets and gestures to the words with both hands, she is excited, behind her it is raining",
  "duration": 5,
  "start_image": "https://replicate.delivery/xezq/rfKExHkg7L2UAyYNJj3p1YrW1M3ZROTQQXupJSOyM5RkwQcKA/tmpowaafuyw.png",
  "negative_prompt": ""
}
```

#### Output

```json
"https://replicate.delivery/xezq/yitkxodvCK7eJK9BFufsMBaHIfnHgJhlNNIiaQi8g8QebGiTB/tmpby0sgn7w.mp4"
```


## Model readme

> # Kling v2.1 (image-to-video)
> 
> An AI text-to-video generation model developed by Kuaishou AI Team.
> 
> _end_image_ is only supported on mode: pro
> 
> ## Privacy policy
> 
> Data from this model is sent from Replicate to Kuaishou.
> 
> https://app.klingai.com/global/dev/document-api/protocols/privacyPolicy
> 
> ## API terms
> 
> https://app.klingai.com/global/dev/document-api/protocols/paidServiceProtocol
> 
> ## Service level agreement
> 
> https://app.klingai.com/global/dev/document-api/protocols/paidLevelProtocol

